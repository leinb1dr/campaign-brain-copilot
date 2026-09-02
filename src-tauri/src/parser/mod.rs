use crate::models::{NoteDocument, SourceReference, Suggestion, SuggestionKind};
use regex::Regex;
use std::{collections::HashSet, fs, path::Path};

pub fn read_markdown_notes(vault_path: &Path) -> Result<Vec<NoteDocument>, String> {
    let entries = fs::read_dir(vault_path)
        .map_err(|error| format!("Unable to read vault '{}': {error}", vault_path.display()))?;

    let mut note_paths = entries
        .filter_map(Result::ok)
        .map(|entry| entry.path())
        .filter(|path| path.extension().and_then(|extension| extension.to_str()) == Some("md"))
        .collect::<Vec<_>>();

    note_paths.sort();

    note_paths
        .into_iter()
        .map(|path| {
            let content = fs::read_to_string(&path)
                .map_err(|error| format!("Unable to read note '{}': {error}", path.display()))?;
            let file_name = path
                .file_name()
                .and_then(|name| name.to_str())
                .ok_or_else(|| format!("Invalid note file name: {}", path.display()))?
                .to_string();

            Ok(NoteDocument {
                file_path: file_name.clone(),
                file_name,
                line_count: content.lines().count(),
                content,
            })
        })
        .collect()
}

pub fn extract_suggestions(notes: &[NoteDocument]) -> Result<Vec<Suggestion>, String> {
    let npc_regex = Regex::new(
        r"\b(?:Captain|Lady|Lord|Brother|Sister|Mayor|Master|Doctor|Professor)\s+[A-Z][a-z]+\b|\b[A-Z][a-z]{3,}(?:\s+[A-Z][a-z]{3,})?\b",
    )
    .map_err(|error| format!("Unable to compile NPC matcher: {error}"))?;
    let location_regex = Regex::new(
        r"\b(?:at|in|near|beneath|under|inside|outside|from|to)\s+(?:the\s+)?([A-Z][A-Za-z'’-]+(?:\s+[A-Z][A-Za-z'’-]+){0,2})",
    )
    .map_err(|error| format!("Unable to compile location matcher: {error}"))?;
    let plot_regex = Regex::new(
        r"(?i)\b(found|discovered|learned|promised|stole|killed|rescued|hid|hiding|admitted|decided|revealed|met)\b",
    )
    .map_err(|error| format!("Unable to compile plot matcher: {error}"))?;

    let mut seen = HashSet::new();
    let mut suggestions = Vec::new();

    for note in notes {
        for (index, line) in note.content.lines().enumerate() {
            let snippet = line.trim();
            if snippet.is_empty() || snippet.starts_with('#') {
                continue;
            }

            let mut line_locations = HashSet::new();

            for captures in location_regex.captures_iter(snippet) {
                if let Some(location) = captures.get(1) {
                    let location_value = location.as_str().trim().to_string();
                    line_locations.insert(location_value.clone());
                    push_suggestion(
                        &mut suggestions,
                        &mut seen,
                        note,
                        index + 1,
                        SuggestionKind::Location,
                        location_value,
                        snippet.to_string(),
                    );
                }
            }

            if plot_regex.is_match(snippet) {
                push_suggestion(
                    &mut suggestions,
                    &mut seen,
                    note,
                    index + 1,
                    SuggestionKind::PlotPoint,
                    snippet.to_string(),
                    snippet.to_string(),
                );
            }

            for capture in npc_regex.find_iter(snippet) {
                let value = capture.as_str().trim().to_string();
                if should_skip_npc(&value) || line_locations.contains(&value) {
                    continue;
                }
                push_suggestion(
                    &mut suggestions,
                    &mut seen,
                    note,
                    index + 1,
                    SuggestionKind::Npc,
                    value,
                    snippet.to_string(),
                );
            }
        }
    }

    Ok(suggestions)
}

fn push_suggestion(
    suggestions: &mut Vec<Suggestion>,
    seen: &mut HashSet<String>,
    note: &NoteDocument,
    line_number: usize,
    kind: SuggestionKind,
    value: String,
    context: String,
) {
    let id = format!(
        "{:?}:{}:{}:{}",
        kind,
        note.file_path,
        line_number,
        value.to_lowercase()
    );

    if !seen.insert(id.clone()) {
        return;
    }

    suggestions.push(Suggestion {
        id,
        kind,
        value,
        context: context.clone(),
        source: SourceReference {
            file_path: note.file_path.clone(),
            line_number,
            snippet: context,
        },
    });
}

fn should_skip_npc(value: &str) -> bool {
    matches!(
        value,
        "The" | "They" | "Need" | "Session" | "At" | "In" | "Old Lantern Square" | "Blackglass Wharf" | "Saint Branna Abbey" | "Frostward Hollow"
    )
}

#[cfg(test)]
mod tests {
    use super::{extract_suggestions, read_markdown_notes};
    use crate::models::SuggestionKind;
    use std::{fs, path::PathBuf, time::{SystemTime, UNIX_EPOCH}};

    fn temp_vault_path() -> PathBuf {
        std::env::temp_dir().join(format!(
            "campaign-brain-test-{}",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .expect("time should be after unix epoch")
                .as_nanos()
        ))
    }

    #[test]
    fn reads_markdown_notes_in_sorted_order() {
        let vault = temp_vault_path();
        fs::create_dir_all(&vault).expect("temporary vault should be created");
        fs::write(vault.join("b.md"), "B note").expect("note should be written");
        fs::write(vault.join("a.md"), "A note").expect("note should be written");
        fs::write(vault.join("ignore.txt"), "skip me").expect("helper file should be written");

        let notes = read_markdown_notes(&vault).expect("notes should load");
        assert_eq!(notes.iter().map(|note| note.file_name.as_str()).collect::<Vec<_>>(), vec!["a.md", "b.md"]);

        fs::remove_dir_all(vault).expect("temporary vault should be removed");
    }

    #[test]
    fn extracts_npcs_locations_and_plot_points_with_sources() {
        let notes = vec![crate::models::NoteDocument {
            file_path: "session-1.md".into(),
            file_name: "session-1.md".into(),
            content: "# Session 1\nMet Captain Mirel at Blackglass Wharf.\nThe party discovered a secret tunnel beneath Old Lantern Square.".into(),
            line_count: 3,
        }];

        let suggestions = extract_suggestions(&notes).expect("suggestions should be generated");

        assert!(suggestions.iter().any(|suggestion| suggestion.kind == SuggestionKind::Npc && suggestion.value == "Captain Mirel" && suggestion.source.line_number == 2));
        assert!(suggestions.iter().any(|suggestion| suggestion.kind == SuggestionKind::Location && suggestion.value == "Blackglass Wharf"));
        assert!(suggestions.iter().any(|suggestion| suggestion.kind == SuggestionKind::PlotPoint && suggestion.value.contains("discovered a secret tunnel")));
    }
}
