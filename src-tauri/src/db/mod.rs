use crate::models::{ApprovedFact, SourceReference, Suggestion, SuggestionKind};
use rusqlite::{params, Connection};
use std::path::{Path, PathBuf};

const DATABASE_NAME: &str = ".campaign-brain.sqlite3";

fn database_path(vault_path: &Path) -> PathBuf {
    vault_path.join(DATABASE_NAME)
}

pub fn initialize(vault_path: &Path) -> Result<(), String> {
    let connection = Connection::open(database_path(vault_path))
        .map_err(|error| format!("Unable to open campaign database: {error}"))?;

    connection
        .execute_batch(
            "
            CREATE TABLE IF NOT EXISTS campaigns (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                vault_path TEXT NOT NULL UNIQUE,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS approved_facts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                kind TEXT NOT NULL,
                value TEXT NOT NULL,
                note_path TEXT NOT NULL,
                line_number INTEGER NOT NULL,
                snippet TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(kind, value, note_path, line_number)
            );
            ",
        )
        .map_err(|error| format!("Unable to initialize campaign database: {error}"))?;

    let campaign_name = vault_path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("Campaign Vault");

    connection
        .execute(
            "INSERT OR IGNORE INTO campaigns (name, vault_path) VALUES (?1, ?2)",
            params![campaign_name, vault_path.display().to_string()],
        )
        .map_err(|error| format!("Unable to register campaign vault: {error}"))?;

    Ok(())
}

pub fn list_approved_facts(vault_path: &Path) -> Result<Vec<ApprovedFact>, String> {
    let connection = Connection::open(database_path(vault_path))
        .map_err(|error| format!("Unable to open campaign database: {error}"))?;
    let mut statement = connection
        .prepare(
            "SELECT id, kind, value, note_path, line_number, snippet
             FROM approved_facts
             ORDER BY value ASC, line_number ASC",
        )
        .map_err(|error| format!("Unable to prepare approved facts query: {error}"))?;

    let rows = statement
        .query_map([], |row| {
            Ok(ApprovedFact {
                id: row.get(0)?,
                kind: parse_kind(row.get::<_, String>(1)?),
                value: row.get(2)?,
                source: SourceReference {
                    file_path: row.get(3)?,
                    line_number: row.get(4)?,
                    snippet: row.get(5)?,
                },
            })
        })
        .map_err(|error| format!("Unable to load approved facts: {error}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("Unable to read approved facts: {error}"))
}

pub fn save_approved_fact(vault_path: &Path, suggestion: &Suggestion) -> Result<(), String> {
    let connection = Connection::open(database_path(vault_path))
        .map_err(|error| format!("Unable to open campaign database: {error}"))?;

    connection
        .execute(
            "INSERT OR IGNORE INTO approved_facts (kind, value, note_path, line_number, snippet)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![
                format_kind(&suggestion.kind),
                suggestion.value,
                suggestion.source.file_path,
                suggestion.source.line_number,
                suggestion.source.snippet,
            ],
        )
        .map_err(|error| format!("Unable to save approved fact: {error}"))?;

    Ok(())
}

fn format_kind(kind: &SuggestionKind) -> &'static str {
    match kind {
        SuggestionKind::Npc => "npc",
        SuggestionKind::Location => "location",
        SuggestionKind::PlotPoint => "plot_point",
    }
}

fn parse_kind(value: String) -> SuggestionKind {
    match value.as_str() {
        "location" => SuggestionKind::Location,
        "plot_point" => SuggestionKind::PlotPoint,
        _ => SuggestionKind::Npc,
    }
}
