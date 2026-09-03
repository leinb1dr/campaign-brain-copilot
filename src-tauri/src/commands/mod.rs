use crate::{
    db,
    models::{slugify, summarize_locations, CampaignOverview, LocationBriefing, Suggestion, SuggestionKind},
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
pub fn open_example_campaign() -> Result<CampaignOverview, String> {
    let example_vault = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../example-vault");
    load_campaign(example_vault)
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
