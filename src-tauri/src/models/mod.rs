use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SourceReference {
    pub file_path: String,
    pub line_number: usize,
    pub snippet: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NoteDocument {
    pub file_path: String,
    pub file_name: String,
    pub content: String,
    pub line_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case")]
pub enum SuggestionKind {
    Npc,
    Location,
    PlotPoint,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Suggestion {
    pub id: String,
    pub kind: SuggestionKind,
    pub value: String,
    pub context: String,
    pub source: SourceReference,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApprovedFact {
    pub id: i64,
    pub kind: SuggestionKind,
    pub value: String,
    pub source: SourceReference,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocationSummary {
    pub id: String,
    pub name: String,
    pub source_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocationBriefing {
    pub id: String,
    pub name: String,
    pub sources: Vec<SourceReference>,
    pub related_plot_points: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CampaignOverview {
    pub campaign_name: String,
    pub vault_path: String,
    pub notes: Vec<NoteDocument>,
    pub suggestions: Vec<Suggestion>,
    pub approved_facts: Vec<ApprovedFact>,
    pub locations: Vec<LocationSummary>,
}

pub fn slugify(value: &str) -> String {
    let mut slug = String::new();
    let mut previous_was_dash = false;

    for character in value.chars().flat_map(|character| character.to_lowercase()) {
        if character.is_ascii_alphanumeric() {
            slug.push(character);
            previous_was_dash = false;
        } else if !previous_was_dash {
            slug.push('-');
            previous_was_dash = true;
        }
    }

    slug.trim_matches('-').to_string()
}

pub fn summarize_locations(approved_facts: &[ApprovedFact]) -> Vec<LocationSummary> {
    let mut grouped = BTreeMap::<String, (String, usize)>::new();

    for fact in approved_facts.iter().filter(|fact| fact.kind == SuggestionKind::Location) {
        let entry = grouped
            .entry(slugify(&fact.value))
            .or_insert_with(|| (fact.value.clone(), 0));
        entry.1 += 1;
    }

    grouped
        .into_iter()
        .map(|(id, (name, source_count))| LocationSummary {
            id,
            name,
            source_count,
        })
        .collect()
}
