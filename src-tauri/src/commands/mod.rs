use crate::{
    db,
    models::{
        slugify, summarize_locations, CampaignOverview, DirectoryEntry, DirectoryListing, LocationBriefing,
        Suggestion, SuggestionKind,
    },
    parser,
};
use std::{collections::HashSet, fs, path::{Path, PathBuf}};

#[cfg_attr(feature = "desktop-app", tauri::command)]
pub fn open_campaign(vault_path: String) -> Result<CampaignOverview, String> {
    load_campaign(PathBuf::from(vault_path))
}

#[cfg_attr(feature = "desktop-app", tauri::command)]
pub fn create_campaign(vault_path: String) -> Result<CampaignOverview, String> {
    let vault = PathBuf::from(vault_path);
    fs::create_dir_all(&vault)
        .map_err(|error| format!("Unable to create campaign vault '{}': {error}", vault.display()))?;

    let starter_note_path = vault.join("session-0.md");
    if !starter_note_path.exists() {
        fs::write(
            &starter_note_path,
            "# Session 0\n- Name the first settlement.\n- Decide who owes the party a favor.\n- Leave yourself messy notes; Campaign Brain will organize the canon later.\n",
        )
        .map_err(|error| format!("Unable to seed starter note '{}': {error}", starter_note_path.display()))?;
    }

    load_campaign(vault)
}

#[cfg_attr(feature = "desktop-app", tauri::command)]
pub fn list_directory(path: Option<String>) -> Result<DirectoryListing, String> {
    match path.as_deref().map(str::trim) {
        Some(ROOTS_PATH) => list_roots(),
        Some(value) if !value.is_empty() => read_directory_listing(&PathBuf::from(value)),
        _ => read_directory_listing(&default_root()?),
    }
}

#[cfg_attr(feature = "desktop-app", tauri::command)]
pub fn create_directory(parent_path: String, name: String) -> Result<DirectoryListing, String> {
    if parent_path.trim() == ROOTS_PATH {
        return Err("Choose a drive or folder before creating a new folder.".to_string());
    }
    let folder_name = validate_folder_name(&name)?;
    let parent = PathBuf::from(&parent_path);
    if !parent.is_dir() {
        return Err(format!("Folder '{}' does not exist.", parent.display()));
    }

    let created = parent.join(&folder_name);
    if created.exists() {
        return Err(format!(
            "A folder named '{}' already exists in '{}'.",
            folder_name,
            parent.display()
        ));
    }

    fs::create_dir(&created)
        .map_err(|error| format!("Unable to create folder '{}': {error}", created.display()))?;

    read_directory_listing(&created)
}

const ROOTS_PATH: &str = "::roots";

fn default_root() -> Result<PathBuf, String> {
    std::env::var_os("HOME")
        .or_else(|| std::env::var_os("USERPROFILE"))
        .map(PathBuf::from)
        .or_else(|| std::env::current_dir().ok())
        .filter(|path| path.is_dir())
        .ok_or_else(|| "Unable to locate a starting folder for the picker.".to_string())
}

fn validate_folder_name(name: &str) -> Result<String, String> {
    let folder_name = name.trim();
    if folder_name.contains('/') || folder_name.contains('\\') || folder_name.contains('\0') {
        return Err("Folder names cannot contain path separators.".to_string());
    }
    if folder_name.is_empty() {
        return Err("Enter a folder name.".to_string());
    }
    if folder_name == "." || folder_name == ".." || folder_name.starts_with('.') {
        return Err("That folder name is not allowed.".to_string());
    }
    Ok(folder_name.to_string())
}

fn read_directory_listing(dir: &Path) -> Result<DirectoryListing, String> {
    if !dir.exists() {
        return Err(format!("Folder '{}' does not exist.", dir.display()));
    }
    if !dir.is_dir() {
        return Err(format!("'{}' is not a folder.", dir.display()));
    }

    let mut entries = Vec::new();
    let reader = fs::read_dir(dir)
        .map_err(|error| format!("Unable to read folder '{}': {error}", dir.display()))?;

    for entry in reader {
        let entry = entry.map_err(|error| format!("Unable to read folder '{}': {error}", dir.display()))?;
        let name = entry.file_name().to_string_lossy().to_string();
        if name.starts_with('.') {
            continue;
        }

        let path = entry.path();
        // Follow symlinks so iCloud/Dropbox-style linked folders appear.
        if !path.is_dir() {
            continue;
        }

        entries.push(DirectoryEntry {
            is_vault: is_campaign_vault(&path),
            name,
            path: path.display().to_string(),
        });
    }

    entries.sort_by(|left, right| left.name.to_lowercase().cmp(&right.name.to_lowercase()));

    Ok(DirectoryListing {
        path: dir.display().to_string(),
        parent_path: parent_listing_path(dir),
        entries,
    })
}

fn parent_listing_path(dir: &Path) -> Option<String> {
    match dir.parent() {
        Some(parent) if !parent.as_os_str().is_empty() => Some(parent.display().to_string()),
        _ if cfg!(windows) => Some(ROOTS_PATH.to_string()),
        _ => None,
    }
}

fn list_roots() -> Result<DirectoryListing, String> {
    #[cfg(windows)]
    {
        Ok(DirectoryListing {
            path: ROOTS_PATH.to_string(),
            parent_path: None,
            entries: windows_drive_entries(),
        })
    }
    #[cfg(not(windows))]
    {
        let mut listing = read_directory_listing(Path::new("/"))?;
        listing.path = ROOTS_PATH.to_string();
        listing.parent_path = None;
        Ok(listing)
    }
}

#[cfg(windows)]
fn windows_drive_entries() -> Vec<DirectoryEntry> {
    (b'A'..=b'Z')
        .filter_map(|letter| {
            let drive = format!("{}:\\", letter as char);
            let path = PathBuf::from(&drive);
            path.is_dir().then(|| DirectoryEntry {
                is_vault: false,
                name: format!("{}:", letter as char),
                path: drive,
            })
        })
        .collect()
}

fn is_campaign_vault(path: &Path) -> bool {
    if path.join(".campaign-brain.sqlite3").exists() {
        return true;
    }

    fs::read_dir(path)
        .ok()
        .map(|entries| {
            entries.filter_map(|entry| entry.ok()).any(|entry| {
                entry.path().extension().and_then(|extension| extension.to_str()) == Some("md")
            })
        })
        .unwrap_or(false)
}

#[cfg(feature = "desktop-app")]
#[tauri::command]
pub fn open_example_campaign(app: tauri::AppHandle) -> Result<CampaignOverview, String> {
    load_campaign(example_vault_copy(&app)?)
}

#[cfg(not(feature = "desktop-app"))]
pub fn open_example_campaign() -> Result<CampaignOverview, String> {
    load_campaign(PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../example-vault"))
}

/// Opening a vault writes a SQLite database into it, but the bundled copy lives in the
/// read-only resource directory, so seed a writable copy under the app data directory.
#[cfg(feature = "desktop-app")]
fn example_vault_copy(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    use tauri::Manager;

    let vault = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Unable to locate the app data directory: {error}"))?
        .join("example-vault");

    if vault.exists() {
        return Ok(vault);
    }

    let bundled = app
        .path()
        .resolve("example-vault", tauri::path::BaseDirectory::Resource)
        .map_err(|error| format!("Unable to locate the bundled example vault: {error}"))?;

    copy_dir(&bundled, &vault)?;
    Ok(vault)
}

#[cfg(feature = "desktop-app")]
fn copy_dir(from: &Path, to: &Path) -> Result<(), String> {
    fs::create_dir_all(to)
        .map_err(|error| format!("Unable to create '{}': {error}", to.display()))?;

    let entries = fs::read_dir(from)
        .map_err(|error| format!("Unable to read '{}': {error}", from.display()))?;

    for entry in entries {
        let entry = entry.map_err(|error| format!("Unable to read '{}': {error}", from.display()))?;
        let source = entry.path();
        let target = to.join(entry.file_name());

        if source.is_dir() {
            copy_dir(&source, &target)?;
        } else {
            fs::copy(&source, &target)
                .map_err(|error| format!("Unable to copy '{}': {error}", source.display()))?;
        }
    }

    Ok(())
}

#[cfg_attr(feature = "desktop-app", tauri::command)]
pub fn read_campaign_notes(vault_path: String) -> Result<Vec<crate::models::NoteDocument>, String> {
    parser::read_markdown_notes(Path::new(&vault_path))
}

#[cfg_attr(feature = "desktop-app", tauri::command)]
pub fn generate_suggestions(vault_path: String) -> Result<Vec<Suggestion>, String> {
    let notes = parser::read_markdown_notes(Path::new(&vault_path))?;
    parser::extract_suggestions(&notes)
}

#[cfg_attr(feature = "desktop-app", tauri::command)]
pub fn approve_suggestion(vault_path: String, suggestion: Suggestion) -> Result<CampaignOverview, String> {
    let vault = PathBuf::from(vault_path);
    db::initialize(&vault)?;
    db::save_approved_fact(&vault, &suggestion)?;
    load_campaign(vault)
}

#[cfg_attr(feature = "desktop-app", tauri::command)]
pub fn get_location_briefing(vault_path: String, location_id: String) -> Result<LocationBriefing, String> {
    let vault = PathBuf::from(vault_path);
    db::initialize(&vault)?;
    let approved_facts = db::list_approved_facts(&vault)?;

    let location_name = approved_facts
        .iter()
        .find(|fact| fact.kind == SuggestionKind::Location && slugify(&fact.value) == location_id)
        .map(|fact| fact.value.clone())
        .ok_or_else(|| format!("No approved location found for id '{location_id}'."))?;

    let sources = approved_facts
        .iter()
        .filter(|fact| fact.kind == SuggestionKind::Location && slugify(&fact.value) == location_id)
        .map(|fact| fact.source.clone())
        .collect::<Vec<_>>();

    let location_note_paths = sources
        .iter()
        .map(|source| source.file_path.clone())
        .collect::<HashSet<_>>();

    let related_plot_points = approved_facts
        .iter()
        .filter(|fact| fact.kind == SuggestionKind::PlotPoint && location_note_paths.contains(&fact.source.file_path))
        .map(|fact| fact.value.clone())
        .collect::<Vec<_>>();

    Ok(LocationBriefing {
        id: location_id,
        name: location_name,
        sources,
        related_plot_points,
    })
}

fn load_campaign(vault: PathBuf) -> Result<CampaignOverview, String> {
    if !vault.exists() {
        return Err(format!("Campaign vault '{}' does not exist.", vault.display()));
    }

    db::initialize(&vault)?;
    let notes = parser::read_markdown_notes(&vault)?;
    let approved_facts = db::list_approved_facts(&vault)?;
    let approved_pairs = approved_facts
        .iter()
        .map(|fact| (fact.kind.clone(), fact.value.to_lowercase()))
        .collect::<HashSet<_>>();

    let suggestions = parser::extract_suggestions(&notes)?
        .into_iter()
        .filter(|suggestion| !approved_pairs.contains(&(suggestion.kind.clone(), suggestion.value.to_lowercase())))
        .collect::<Vec<_>>();

    Ok(CampaignOverview {
        campaign_name: vault
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("Campaign Vault")
            .to_string(),
        vault_path: vault.display().to_string(),
        notes,
        locations: summarize_locations(&approved_facts),
        suggestions,
        approved_facts,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    // open_example_campaign is not exercised here: without `desktop-app` it writes SQLite
    // into the checked-in example-vault, and with `desktop-app` it needs a Tauri AppHandle
    // plus the resource resolver. load_campaign is covered via open_campaign on a temp copy.
    use crate::models::SuggestionKind;
    use std::{
        fs,
        path::{Path, PathBuf},
        time::{SystemTime, UNIX_EPOCH},
    };

    fn unique_temp_dir(prefix: &str) -> PathBuf {
        std::env::temp_dir().join(format!(
            "{prefix}-{}",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .expect("time should be after unix epoch")
                .as_nanos()
        ))
    }

    fn example_vault_src() -> PathBuf {
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../example-vault")
    }

    fn fixture_path() -> PathBuf {
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../e2e/fixtures/example-campaign.json")
    }

    fn copy_dir(from: &Path, to: &Path) {
        fs::create_dir_all(to).expect("temp vault directory should be created");
        for entry in fs::read_dir(from).expect("source vault should be readable") {
            let entry = entry.expect("vault entry should be readable");
            let destination = to.join(entry.file_name());
            if entry.file_type().expect("entry type should be readable").is_dir() {
                copy_dir(&entry.path(), &destination);
            } else {
                fs::copy(entry.path(), destination).expect("vault file should copy");
            }
        }
    }

    fn copy_example_vault() -> PathBuf {
        let destination = unique_temp_dir("campaign-brain-example-vault");
        copy_dir(&example_vault_src(), &destination);
        destination
    }

    fn normalize_overview_json(overview: &CampaignOverview) -> serde_json::Value {
        let mut value = serde_json::to_value(overview).expect("overview should serialize");
        value["vaultPath"] = serde_json::json!("<example-vault>");
        value["campaignName"] = serde_json::json!("example-vault");
        value
    }

    #[test]
    fn open_campaign_round_trips_example_vault_through_sqlite() {
        let vault = copy_example_vault();
        let vault_path = vault.display().to_string();

        let first = open_campaign(vault_path.clone()).expect("example vault should open");
        assert_eq!(first.notes.len(), 3);
        assert!(first.approved_facts.is_empty());
        assert!(first.suggestions.iter().any(|suggestion| {
            suggestion.kind == SuggestionKind::Location && suggestion.value == "Blackglass Wharf"
        }));
        assert!(vault.join(".campaign-brain.sqlite3").exists());

        let second = open_campaign(vault_path).expect("reopening the vault should reuse sqlite");
        assert_eq!(second.notes.len(), first.notes.len());
        assert_eq!(second.suggestions.len(), first.suggestions.len());
        assert!(second.approved_facts.is_empty());

        fs::remove_dir_all(vault).expect("temporary vault should be removed");
    }

    #[test]
    fn example_vault_open_campaign_matches_checked_in_fixture() {
        let vault = copy_example_vault();
        let overview = open_campaign(vault.display().to_string()).expect("example vault should open");
        let actual = normalize_overview_json(&overview);
        let expected: serde_json::Value = serde_json::from_str(
            &fs::read_to_string(fixture_path()).expect("checked-in example-campaign fixture should exist"),
        )
        .expect("fixture JSON should parse");

        assert_eq!(
            actual, expected,
            "e2e/fixtures/example-campaign.json drifted from open_campaign(example-vault); regenerate it with dump_example_campaign_fixture"
        );

        fs::remove_dir_all(vault).expect("temporary vault should be removed");
    }

    #[test]
    fn approve_suggestion_persists_and_dedupes_by_kind_and_value() {
        let vault = copy_example_vault();
        fs::write(
            vault.join("session-4.md"),
            "The smugglers met again at Blackglass Wharf after midnight.\n",
        )
        .expect("duplicate location note should be written");

        let opened = open_campaign(vault.display().to_string()).expect("vault should open");
        let wharf_suggestions = opened
            .suggestions
            .iter()
            .filter(|suggestion| {
                suggestion.kind == SuggestionKind::Location && suggestion.value == "Blackglass Wharf"
            })
            .cloned()
            .collect::<Vec<_>>();
        assert!(
            wharf_suggestions.len() >= 2,
            "expected Blackglass Wharf in example-vault plus session-4.md, got {}",
            wharf_suggestions.len()
        );

        let first = wharf_suggestions[0].clone();
        let after_first =
            approve_suggestion(vault.display().to_string(), first.clone()).expect("first approval should save");
        assert!(!after_first.suggestions.iter().any(|suggestion| {
            suggestion.kind == SuggestionKind::Location && suggestion.value.eq_ignore_ascii_case("Blackglass Wharf")
        }));
        assert_eq!(
            after_first
                .approved_facts
                .iter()
                .filter(|fact| fact.value == "Blackglass Wharf")
                .count(),
            1
        );

        let after_second =
            approve_suggestion(vault.display().to_string(), first).expect("duplicate approval should be ignored");
        assert_eq!(
            after_second
                .approved_facts
                .iter()
                .filter(|fact| fact.value == "Blackglass Wharf")
                .count(),
            1
        );

        fs::remove_dir_all(vault).expect("temporary vault should be removed");
    }

    #[test]
    fn get_location_briefing_assembles_sources_and_related_plot_points() {
        let vault = copy_example_vault();
        let opened = open_campaign(vault.display().to_string()).expect("vault should open");

        let location = opened
            .suggestions
            .iter()
            .find(|suggestion| {
                suggestion.kind == SuggestionKind::Location && suggestion.value == "Blackglass Wharf"
            })
            .cloned()
            .expect("example-vault should extract Blackglass Wharf");
        let plot = opened
            .suggestions
            .iter()
            .find(|suggestion| {
                suggestion.kind == SuggestionKind::PlotPoint && suggestion.source.file_path == location.source.file_path
            })
            .cloned()
            .expect("example-vault should extract a plot point from the same note as Blackglass Wharf");

        approve_suggestion(vault.display().to_string(), location).expect("location should approve");
        approve_suggestion(vault.display().to_string(), plot.clone()).expect("plot point should approve");

        let briefing = get_location_briefing(vault.display().to_string(), slugify("Blackglass Wharf"))
            .expect("briefing should assemble");
        assert_eq!(briefing.id, "blackglass-wharf");
        assert_eq!(briefing.name, "Blackglass Wharf");
        assert!(briefing
            .sources
            .iter()
            .any(|source| source.file_path == "session-1.md"));
        assert!(briefing.related_plot_points.iter().any(|value| value == &plot.value));

        fs::remove_dir_all(vault).expect("temporary vault should be removed");
    }

    #[test]
    fn list_directory_skips_hidden_folders_and_marks_vaults() {
        let root = unique_temp_dir("campaign-brain-list-directory");
        fs::create_dir_all(root.join("harbor-notes")).expect("visible folder should be created");
        fs::create_dir_all(root.join(".hidden")).expect("hidden folder should be created");
        fs::write(root.join("notes.md"), "not a folder\n").expect("file should be ignored");
        fs::write(
            root.join("harbor-notes").join("session-1.md"),
            "# Harbor\n",
        )
        .expect("vault note should be written");

        let listing = list_directory(Some(root.display().to_string())).expect("directory should list");
        let names = listing
            .entries
            .iter()
            .map(|entry| entry.name.as_str())
            .collect::<Vec<_>>();
        assert_eq!(names, vec!["harbor-notes"]);
        assert!(listing.entries[0].is_vault);
        assert_eq!(listing.path, root.display().to_string());

        fs::remove_dir_all(root).expect("temporary directory should be removed");
    }

    #[test]
    #[cfg(unix)]
    fn list_directory_includes_symlinked_folders() {
        let root = unique_temp_dir("campaign-brain-symlink-directory");
        fs::create_dir_all(root.join("real-vault")).expect("real folder should be created");
        fs::write(root.join("real-vault").join("session-1.md"), "# Harbor\n").expect("note should be written");

        #[cfg(unix)]
        {
            std::os::unix::fs::symlink(root.join("real-vault"), root.join("linked-vault"))
                .expect("directory symlink should be created");
            let listing = list_directory(Some(root.display().to_string())).expect("directory should list");
            let linked = listing
                .entries
                .iter()
                .find(|entry| entry.name == "linked-vault")
                .expect("symlinked folder should appear");
            assert!(linked.is_vault);
        }

        fs::remove_dir_all(root).expect("temporary directory should be removed");
    }

    #[test]
    fn list_directory_roots_is_not_a_usable_vault_path() {
        let listing = list_directory(Some("::roots".to_string())).expect("roots listing should succeed");
        assert_eq!(listing.path, "::roots");
        assert!(listing.parent_path.is_none());
        let rejected = create_directory("::roots".to_string(), "vault".to_string());
        assert!(rejected.unwrap_err().contains("Choose a drive or folder"));
    }

    #[test]
    fn create_directory_makes_a_child_folder_and_opens_it() {
        let root = unique_temp_dir("campaign-brain-create-directory");
        fs::create_dir_all(&root).expect("parent folder should exist");

        let listing = create_directory(root.display().to_string(), "  frostward  ".to_string())
            .expect("folder should be created");
        assert!(root.join("frostward").is_dir());
        assert_eq!(listing.path, root.join("frostward").display().to_string());
        assert!(listing.entries.is_empty());

        let duplicate = create_directory(root.display().to_string(), "frostward".to_string());
        assert!(duplicate.unwrap_err().contains("already exists"));

        let invalid = create_directory(root.display().to_string(), "foo/bar".to_string());
        assert!(invalid.unwrap_err().contains("path separators"));

        fs::remove_dir_all(root).expect("temporary directory should be removed");
    }

    #[test]
    fn create_campaign_seeds_session_zero_and_can_be_reopened() {
        let vault = unique_temp_dir("campaign-brain-create-campaign");
        let created = create_campaign(vault.display().to_string()).expect("vault should be created");
        assert_eq!(created.notes.len(), 1);
        assert_eq!(created.notes[0].file_name, "session-0.md");
        assert!(vault.join("session-0.md").exists());
        assert!(vault.join(".campaign-brain.sqlite3").exists());

        let reopened = open_campaign(vault.display().to_string()).expect("created vault should open");
        assert_eq!(reopened.notes.len(), 1);
        assert_eq!(reopened.campaign_name, created.campaign_name);

        fs::remove_dir_all(vault).expect("temporary vault should be removed");
    }

    #[test]
    #[ignore = "run explicitly to regenerate e2e/fixtures/example-campaign.json from example-vault"]
    fn dump_example_campaign_fixture() {
        let vault = copy_example_vault();
        let overview = open_campaign(vault.display().to_string()).expect("example vault should open");
        let json = normalize_overview_json(&overview);
        let path = fixture_path();
        fs::create_dir_all(path.parent().expect("fixture directory")).expect("fixture directory should exist");
        fs::write(&path, format!("{}\n", serde_json::to_string_pretty(&json).expect("fixture should serialize")))
            .expect("fixture should be written");
        fs::remove_dir_all(vault).expect("temporary vault should be removed");
    }
}
