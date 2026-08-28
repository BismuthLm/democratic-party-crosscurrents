const directCampByOrganization = new Map([
  ["congressional_progressive_caucus", "cpc_aligned"],
  ["cpc_pac", "cpc_aligned"],
  ["new_democrat_coalition", "new_dem_aligned"],
  ["newdem_action_fund", "new_dem_aligned"],
  ["blue_dog_coalition", "blue_dog_aligned"],
  ["blue_dog_pac", "blue_dog_aligned"],
  ["dsa_national", "movement_left_network"],
  ["nyc_dsa", "movement_left_network"],
  ["justice_democrats", "movement_left_network"],
  ["dccc", "party_network"],
  ["dscc", "party_network"],
  ["house_democratic_leadership", "party_network"],
  ["senate_democratic_leadership", "party_network"],
]);

const reviewed = (relationship) => ["A", "B"].includes(relationship.evidenceGrade);
const evidenceWeight = (relationship) => relationship.evidenceGrade === "A" ? 1 : 0.8;
const latest = (...values) => values.filter(Boolean).sort().at(-1) ?? null;
const earliest = (...values) => values.filter(Boolean).sort().at(0) ?? null;

const directDerivation = (relationship, campId) => ({
  id: `derived-${relationship.id}-${campId}`,
  personId: relationship.personId,
  campId,
  type: "derived_camp",
  validFrom: relationship.validFrom,
  validTo: relationship.validTo,
  cycle: relationship.cycle ?? null,
  sourceDate: relationship.sourceDate,
  observedAt: relationship.observedAt,
  supersededAt: null,
  evidenceGrade: "C",
  evidenceWeight: evidenceWeight(relationship),
  reviewStatus: "derived_from_reviewed_evidence",
  reviewer: relationship.reviewer,
  rationale: `taxonomy-v1 maps ${relationship.organizationId} ${relationship.type} to ${campId}; endorsement remains distinct from membership.`,
  sourceRelationshipIds: [relationship.id],
});

export function deriveCampRelationships(observedRelationships) {
  const derivations = observedRelationships.flatMap((relationship) => {
    const campId = directCampByOrganization.get(relationship.organizationId);
    return campId && reviewed(relationship) ? [directDerivation(relationship, campId)] : [];
  });

  const wfpLinks = observedRelationships.filter((relationship) => relationship.organizationId === "working_families_party" && relationship.cycle && reviewed(relationship));
  const ourRevolutionLinks = observedRelationships.filter((relationship) => relationship.organizationId === "our_revolution" && relationship.cycle && reviewed(relationship));
  for (const wfp of wfpLinks) {
    for (const ourRevolution of ourRevolutionLinks.filter((relationship) => relationship.personId === wfp.personId && relationship.cycle === wfp.cycle)) {
      derivations.push({
        id: `derived-compound-wfp-our-revolution-${wfp.personId}-${wfp.cycle}-${wfp.id}-${ourRevolution.id}`,
        personId: wfp.personId,
        campId: "movement_left_network",
        type: "derived_camp",
        validFrom: latest(wfp.validFrom, ourRevolution.validFrom),
        validTo: earliest(wfp.validTo, ourRevolution.validTo),
        cycle: wfp.cycle,
        sourceDate: latest(wfp.sourceDate, ourRevolution.sourceDate),
        observedAt: latest(wfp.observedAt, ourRevolution.observedAt),
        supersededAt: null,
        evidenceGrade: "C",
        evidenceWeight: Math.min(evidenceWeight(wfp), evidenceWeight(ourRevolution)),
        reviewStatus: "derived_from_reviewed_compound_evidence",
        reviewer: wfp.reviewer === ourRevolution.reviewer ? wfp.reviewer : `${wfp.reviewer}; ${ourRevolution.reviewer}`,
        rationale: `taxonomy-v1 requires reviewed Working Families Party and Our Revolution endorsements in the same ${wfp.cycle} cycle; neither link alone establishes movement-left camp identity.`,
        sourceRelationshipIds: [wfp.id, ourRevolution.id],
      });
    }
  }
  return derivations;
}
