// Generated from data/power-data.json by npm run build:data.
window.CROSSCURRENTS_DATA = {
  "meta": {
    "title": "Democratic Power Index",
    "subtitle": "Who is gaining ground inside the Democratic coalition?",
    "editorialAsOf": "2026-08-28",
    "generatedOn": "2026-08-28",
    "cycle": "2025–2026",
    "methodVersion": "2.1",
    "scope": "Three formal House ideological caucuses, plus a separate broad-wing primary tracker",
    "importantNote": "Caucus memberships overlap. A member may count in more than one faction. The index measures observable power, not ideological correctness or general-election electability.",
    "feeds": {
      "editorial": {
        "label": "Rosters, results and coding",
        "asOf": "2026-08-28",
        "updateMode": "Hand-reviewed"
      },
      "fec": {
        "label": "Affiliated PAC finance",
        "asOf": "2026-07-31",
        "updateMode": "Weekly automated refresh",
        "coverageByFaction": {
          "progressive": "2026-07-31",
          "newdem": "2026-07-31",
          "bluedog": "2026-07-31"
        }
      },
      "opinion": {
        "label": "Public opinion series",
        "asOf": "2026-08-28",
        "updateMode": "Field dates shown per card"
      }
    }
  },
  "domains": [
    {
      "id": "institutional",
      "label": "Institutional",
      "description": "Seats, caucus scale and access to elected House Democratic leadership.",
      "defaultWeight": 30
    },
    {
      "id": "electoral",
      "label": "Electoral",
      "description": "Candidate pipeline, endorsements and documented primary or battleground traction.",
      "defaultWeight": 30
    },
    {
      "id": "money",
      "label": "Money",
      "description": "PAC receipts, donor mix, candidate support and independent spending from FEC reports.",
      "defaultWeight": 25
    },
    {
      "id": "agenda",
      "label": "Agenda",
      "description": "Capacity to publish, coordinate and advance a current governing programme.",
      "defaultWeight": 15
    },
    {
      "id": "momentum",
      "label": "Broad-wing momentum",
      "description": "A curated candidate and event signal kept outside the formal-caucus score by default.",
      "defaultWeight": 0
    }
  ],
  "factions": [
    {
      "id": "progressive",
      "shortName": "Progressive",
      "name": "Congressional Progressive Caucus",
      "color": "#e5533d",
      "definition": "The formal congressional caucus advocating an economically progressive programme including universal health care, worker power and climate action.",
      "officialUrl": "https://progressives.house.gov/",
      "membersPublished": 101,
      "membershipNote": "Published total includes one Senate member, Bernie Sanders.",
      "pacId": "C00513176"
    },
    {
      "id": "newdem",
      "shortName": "New Dem",
      "name": "New Democrat Coalition",
      "color": "#2478b9",
      "definition": "The formal House coalition describing itself as pro-growth, pro-innovation, fiscally responsible and solutions oriented.",
      "officialUrl": "https://newdemocratcoalition.house.gov/",
      "membersPublished": 114,
      "membershipNote": "Published coalition total; its roster includes voting members and territorial delegates.",
      "pacId": "C00409730"
    },
    {
      "id": "bluedog",
      "shortName": "Blue Dog",
      "name": "Blue Dog Coalition",
      "color": "#96722d",
      "definition": "The formal House caucus organised around fiscal responsibility, national security and bipartisan governing.",
      "officialUrl": "https://bluedogs-gluesenkampperez.house.gov/",
      "membersPublished": 10,
      "membershipNote": "Current official and PAC rosters list ten members.",
      "pacId": "C00305318"
    }
  ],
  "overlaps": [
    {
      "left": "progressive",
      "right": "newdem",
      "count": 31,
      "jaccard": 16.94,
      "note": "Thirty-one House members appear on both current official rosters."
    },
    {
      "left": "newdem",
      "right": "bluedog",
      "count": 6,
      "jaccard": 5.08,
      "note": "Six of ten Blue Dogs also appear on the New Dem roster."
    },
    {
      "left": "progressive",
      "right": "bluedog",
      "count": 0,
      "jaccard": 0,
      "note": "No current member appears on both official rosters."
    }
  ],
  "metrics": [
    {
      "id": "published_members",
      "domain": "institutional",
      "label": "Published caucus membership",
      "description": "Current total claimed by each caucus on its official site.",
      "format": "integer",
      "included": true,
      "values": {
        "progressive": 101,
        "newdem": 114,
        "bluedog": 10
      },
      "asOf": "2026-08-28",
      "sources": [
        "cpc-members",
        "ndc-home",
        "bd-members"
      ],
      "caveat": "Not unique people: memberships overlap, and published totals differ in treatment of a senator and delegates."
    },
    {
      "id": "democratic_leadership_offices",
      "domain": "institutional",
      "label": "Selected House Democratic leadership offices",
      "description": "Faction members holding 16 named elected, campaign, messaging and Steering leadership roles.",
      "format": "integer",
      "included": true,
      "values": {
        "progressive": 8,
        "newdem": 6,
        "bluedog": 0
      },
      "asOf": "2026-08-28",
      "sources": [
        "dems-leadership",
        "house-democrats",
        "cpc-members",
        "ndc-members",
        "bd-members"
      ],
      "caveat": "Manual roster crosswalk. Two officeholders belong to both CPC and New Dem; counts are intentionally non-exclusive."
    },
    {
      "id": "standing_committee_ranking_members",
      "domain": "institutional",
      "label": "Standing-committee ranking members",
      "description": "Faction members serving as the top Democrat on twenty House standing committees.",
      "format": "integer",
      "included": true,
      "values": {
        "progressive": 12,
        "newdem": 6,
        "bluedog": 0
      },
      "asOf": "2026-08-28",
      "sources": [
        "house-committee-leadership",
        "cpc-members",
        "ndc-members",
        "bd-members"
      ],
      "caveat": "Manual roster crosswalk. Two ranking members belong to both CPC and New Dem; select committees and subcommittees are excluded."
    },
    {
      "id": "membership_change_floor",
      "domain": "institutional",
      "label": "Documented net additions during 119th Congress",
      "description": "A conservative floor based only on explicit official before/after counts or welcome notices.",
      "format": "signed",
      "included": false,
      "values": {
        "progressive": 1,
        "newdem": 4,
        "bluedog": 0
      },
      "asOf": "2026-08-28",
      "sources": [
        "cpc-grijalva",
        "ndc-110",
        "ndc-home",
        "bd-members"
      ],
      "caveat": "This is a documented floor, not a complete join/leave audit; keep it outside the default score."
    },
    {
      "id": "freshman_119",
      "domain": "institutional",
      "label": "119th Congress freshmen announced",
      "description": "Newly elected members publicly welcomed or counted by the caucus at the start of the Congress.",
      "format": "integer",
      "included": false,
      "values": {
        "progressive": 7,
        "newdem": 25,
        "bluedog": null
      },
      "asOf": "2025-01-03",
      "sources": [
        "cpc-freshmen",
        "ndc-110"
      ],
      "caveat": "Blue Dog did not publish a directly comparable count in the sources reviewed."
    },
    {
      "id": "endorsed_candidates_2026",
      "domain": "electoral",
      "label": "2026 PAC-endorsed candidates",
      "description": "Current candidate pipeline promoted by each faction's affiliated PAC.",
      "format": "integer",
      "included": true,
      "values": {
        "progressive": 25,
        "newdem": 34,
        "bluedog": 12
      },
      "asOf": "2026-08-13",
      "sources": [
        "cpc-pac-home",
        "ndaf-34",
        "bdpac-12"
      ],
      "caveat": "CPC value is the count of current endorsement tiles on its official page; PACs use different endorsement strategies."
    },
    {
      "id": "known_primary_wins_2026",
      "domain": "electoral",
      "label": "Confirmed PAC primary wins found",
      "description": "Minimum wins explicitly celebrated by the PAC sources reviewed for this snapshot.",
      "format": "integer",
      "included": false,
      "values": {
        "progressive": 3,
        "newdem": 3,
        "bluedog": 1
      },
      "asOf": "2026-08-13",
      "sources": [
        "cpc-pac-press",
        "ndaf-press",
        "bdpac-news"
      ],
      "caveat": "A lower bound, not a complete endorsement win-rate denominator; excluded from the default score."
    },
    {
      "id": "red_to_blue_2026",
      "domain": "electoral",
      "label": "Endorsees in DCCC Red to Blue",
      "description": "Faction-endorsed candidates publicly identified as DCCC Red to Blue candidates.",
      "format": "integer",
      "included": false,
      "values": {
        "progressive": null,
        "newdem": 20,
        "bluedog": 4
      },
      "asOf": "2026-05-04",
      "sources": [
        "ndaf-red2blue",
        "bdpac-news"
      ],
      "caveat": "New Dem reported that 20 of an earlier 24-candidate slate were in Red to Blue; Blue Dog reported four. CPC comparison is unavailable, so this stays outside the default score."
    },
    {
      "id": "pac_receipts_monthly",
      "domain": "money",
      "label": "PAC receipts per reporting month",
      "description": "Total 2025–26 receipts divided by months in the FEC coverage period.",
      "format": "currency",
      "included": true,
      "values": {
        "progressive": 304820.09,
        "newdem": 218147.12,
        "bluedog": 99471.77
      },
      "asOf": "2026-07-31",
      "sources": [
        "fec-cpc",
        "fec-ndc",
        "fec-bd"
      ],
      "caveat": "Affiliated PAC scale is not the same as support for every caucus member."
    },
    {
      "id": "pac_total_receipts",
      "domain": "money",
      "label": "PAC total receipts",
      "description": "Receipts reported to the FEC in the 2025–26 cycle through July 2026.",
      "format": "currency",
      "included": false,
      "values": {
        "progressive": 5791581.68,
        "newdem": 4144795.26,
        "bluedog": 1889963.54
      },
      "asOf": "2026-07-31",
      "sources": [
        "fec-cpc",
        "fec-ndc",
        "fec-bd"
      ],
      "caveat": "Supporting measure; monthly receipts is already in the default score."
    },
    {
      "id": "pac_disbursements",
      "domain": "money",
      "label": "PAC total disbursements",
      "description": "Total federal disbursements in the current FEC cycle.",
      "format": "currency",
      "included": false,
      "values": {
        "progressive": 6751574.25,
        "newdem": 3392784.38,
        "bluedog": 1871591.89
      },
      "asOf": "2026-07-31",
      "sources": [
        "fec-cpc",
        "fec-ndc",
        "fec-bd"
      ],
      "caveat": "Spending can include operating costs and may exceed current-cycle receipts because of beginning cash."
    },
    {
      "id": "individual_contribution_share",
      "domain": "money",
      "label": "Individual share of PAC contributions",
      "description": "FEC-reported individual contributions as a percentage of all contributions.",
      "format": "percent",
      "included": true,
      "values": {
        "progressive": 82.75,
        "newdem": 25.19,
        "bluedog": 23.59
      },
      "asOf": "2026-07-31",
      "sources": [
        "fec-cpc",
        "fec-ndc",
        "fec-bd"
      ],
      "caveat": "Measures donor source mix, not donor ideology or number of donors."
    },
    {
      "id": "unitemized_individual_share",
      "domain": "money",
      "label": "Unitemized share of individual contributions",
      "description": "Unitemized individual dollars divided by all individual dollars.",
      "format": "percent",
      "included": false,
      "values": {
        "progressive": 72.92,
        "newdem": 10.09,
        "bluedog": 29.72
      },
      "asOf": "2026-07-31",
      "sources": [
        "fec-cpc",
        "fec-ndc",
        "fec-bd"
      ],
      "caveat": "Not a small-donor count. Unitemized receipts are a reporting category and can aggregate repeat donors."
    },
    {
      "id": "independent_expenditures",
      "domain": "money",
      "label": "Independent expenditures",
      "description": "FEC-reported independent spending supporting or opposing federal candidates.",
      "format": "currency",
      "included": true,
      "values": {
        "progressive": 2362130.5,
        "newdem": 0,
        "bluedog": 0
      },
      "asOf": "2026-07-31",
      "sources": [
        "fec-cpc",
        "fec-ndc",
        "fec-bd"
      ],
      "caveat": "Zero means none reported in this PAC summary, not no allied outside spending."
    },
    {
      "id": "candidate_contributions",
      "domain": "money",
      "label": "Direct federal candidate contributions",
      "description": "PAC contributions made to federal candidate committees in the cycle.",
      "format": "currency",
      "included": true,
      "values": {
        "progressive": 575000,
        "newdem": 645000,
        "bluedog": 298500
      },
      "asOf": "2026-07-31",
      "sources": [
        "fec-cpc",
        "fec-ndc",
        "fec-bd"
      ],
      "caveat": "Does not include all forms of support, joint fundraising or allied organisations."
    },
    {
      "id": "cash_on_hand",
      "domain": "money",
      "label": "PAC cash on hand",
      "description": "Ending cash reported in the latest FEC totals record.",
      "format": "currency",
      "included": false,
      "values": {
        "progressive": 142374.69,
        "newdem": 990766.43,
        "bluedog": 234136.68
      },
      "asOf": "2026-07-31",
      "sources": [
        "fec-cpc",
        "fec-ndc",
        "fec-bd"
      ],
      "caveat": "A point-in-time balance can fall after a deliberate burst of spending."
    },
    {
      "id": "receipts_per_member",
      "domain": "money",
      "label": "PAC receipts per published member",
      "description": "Total receipts divided by published caucus size.",
      "format": "currency",
      "included": false,
      "values": {
        "progressive": 57342.39,
        "newdem": 36357.85,
        "bluedog": 188996.35
      },
      "asOf": "2026-07-31",
      "sources": [
        "fec-cpc",
        "fec-ndc",
        "fec-bd",
        "cpc-members",
        "ndc-home",
        "bd-members"
      ],
      "caveat": "Small caucuses naturally score highly; use as an intensity measure only."
    },
    {
      "id": "agenda_breadth",
      "domain": "agenda",
      "label": "Published current agenda areas",
      "description": "Count of top-level policy areas or frameworks in each current official programme.",
      "format": "integer",
      "included": true,
      "values": {
        "progressive": 10,
        "newdem": 11,
        "bluedog": 4
      },
      "asOf": "2026-08-28",
      "sources": [
        "cpc-stands",
        "ndc-agenda",
        "bdpac-home"
      ],
      "caveat": "A measure of published breadth, not quality, popularity or enactment. Taxonomies differ."
    },
    {
      "id": "current_policy_outputs",
      "domain": "agenda",
      "label": "Recent policy outputs visible",
      "description": "Count of clearly enumerated bills, actions or top-level policy deliverables in the latest source snapshot.",
      "format": "integer",
      "included": false,
      "values": {
        "progressive": 10,
        "newdem": 31,
        "bluedog": 4
      },
      "asOf": "2026-08-28",
      "sources": [
        "cpc-bills",
        "ndc-agenda",
        "bd-legislation"
      ],
      "caveat": "Different output types; useful for exploration but excluded from the default score."
    },
    {
      "id": "documented_policy_wins_90d",
      "domain": "agenda",
      "label": "Documented federal policy wins, past 90 days",
      "description": "Tracked claims of a faction priority becoming law or being formally adopted.",
      "format": "integer",
      "included": false,
      "values": {
        "progressive": 0,
        "newdem": 0,
        "bluedog": 1
      },
      "asOf": "2026-08-28",
      "sources": [
        "bd-housing-win"
      ],
      "caveat": "The event log is not yet a complete bill-to-faction attribution dataset. Zero means none tracked, not none achieved."
    },
    {
      "id": "recent_win_points",
      "domain": "momentum",
      "label": "Broad-wing recent win points",
      "description": "Transparent points from the curated event log: major win 3 and win, policy or agenda event 2; tensions score 0.",
      "format": "points",
      "included": false,
      "values": {
        "progressive": 14,
        "newdem": 6,
        "bluedog": 6
      },
      "asOf": "2026-08-28",
      "sources": [
        "ap-wahab",
        "axios-nixon",
        "ap-change",
        "abc-primaries",
        "week-aug5",
        "bd-housing-win",
        "ap-mamdani",
        "bdpac-news",
        "ndc-agenda"
      ],
      "caveat": "This maps broad candidate alignments onto faction colours; it does not establish formal caucus or PAC affiliation. It is therefore excluded from the formal-caucus score by default."
    },
    {
      "id": "source_coverage",
      "domain": "momentum",
      "label": "Sourced observations in tracker",
      "description": "Number of current event or metric records linked to the faction.",
      "format": "integer",
      "included": false,
      "values": {
        "progressive": 13,
        "newdem": 10,
        "bluedog": 9
      },
      "asOf": "2026-08-28",
      "sources": [
        "methodology"
      ],
      "caveat": "Coverage is a data-quality diagnostic, not political power."
    }
  ],
  "primaryRaces": [
    {
      "date": "2026-08-18",
      "race": "Florida U.S. Senate Democratic primary",
      "winner": "Angie Nixon",
      "alignment": "Progressive / DSA",
      "alignmentId": "progressive",
      "raceType": "statewide",
      "result": "win",
      "margin": null,
      "stakes": "Republican-favoured general election",
      "source": "axios-nixon"
    },
    {
      "date": "2026-08-20",
      "race": "California special election",
      "winner": "Aisha Wahab",
      "alignment": "Progressive",
      "alignmentId": "progressive",
      "raceType": "special",
      "result": "general-election win",
      "margin": null,
      "stakes": "Safe Democratic seat",
      "source": "ap-wahab"
    },
    {
      "date": "2026-08-11",
      "race": "Minnesota U.S. Senate Democratic primary",
      "winner": "Peggy Flanagan",
      "alignment": "Progressive",
      "alignmentId": "progressive",
      "raceType": "statewide",
      "result": "win",
      "margin": null,
      "stakes": "Open Senate seat",
      "source": "ap-change"
    },
    {
      "date": "2026-08-11",
      "race": "Wisconsin governor Democratic primary",
      "winner": "David Crowley",
      "alignment": "Center / institutional",
      "alignmentId": "newdem",
      "raceType": "statewide",
      "result": "win",
      "margin": null,
      "stakes": "Competitive general election",
      "source": "ap-change"
    },
    {
      "date": "2026-08-11",
      "race": "Connecticut 1st District Democratic primary",
      "winner": "Luke Bronin",
      "alignment": "Generational insurgent",
      "alignmentId": "other",
      "raceType": "house",
      "result": "incumbent defeated",
      "margin": null,
      "stakes": "Safe Democratic seat",
      "source": "ap-change"
    },
    {
      "date": "2026-08-04",
      "race": "Michigan U.S. Senate Democratic primary",
      "winner": "Abdul El-Sayed",
      "alignment": "Progressive",
      "alignmentId": "progressive",
      "raceType": "statewide",
      "result": "win",
      "margin": 1,
      "stakes": "Competitive open Senate seat",
      "source": "abc-primaries"
    },
    {
      "date": "2026-08-04",
      "race": "Missouri 1st District Democratic primary",
      "winner": "Wesley Bell",
      "alignment": "Center / institutional",
      "alignmentId": "newdem",
      "raceType": "house",
      "result": "incumbent renomination",
      "margin": 22,
      "stakes": "Safe Democratic seat",
      "source": "abc-primaries"
    },
    {
      "date": "2026-08-04",
      "race": "Washington 3rd District Democratic primary",
      "winner": "Marie Gluesenkamp Perez",
      "alignment": "Blue Dog",
      "alignmentId": "bluedog",
      "raceType": "house",
      "result": "incumbent advances",
      "margin": null,
      "stakes": "Competitive Trump-won district",
      "source": "week-aug5"
    },
    {
      "date": "2026-08-04",
      "race": "Michigan 7th District Democratic primary",
      "winner": "William Lawrence",
      "alignment": "Progressive",
      "alignmentId": "progressive",
      "raceType": "house",
      "result": "win",
      "margin": null,
      "stakes": "Competitive Republican-held seat",
      "source": "week-aug5"
    },
    {
      "date": "2026-07-22",
      "race": "Arizona 1st District Democratic primary",
      "winner": "Amish Shah",
      "alignment": "Anti-establishment / heterodox",
      "alignmentId": "other",
      "raceType": "house",
      "result": "win over DCCC-backed rival",
      "margin": null,
      "stakes": "Majority-making swing seat",
      "source": "ap-shah"
    },
    {
      "date": "2026-06-23",
      "race": "New York Democratic House primaries, three-seat slate",
      "winner": "Three Mamdani-backed candidates",
      "alignment": "Progressive / DSA",
      "alignmentId": "progressive",
      "raceType": "house slate",
      "result": "3–0 endorsement sweep",
      "margin": null,
      "stakes": "Two incumbents defeated; deep-blue seats",
      "source": "ap-mamdani"
    },
    {
      "date": "2026-05-19",
      "race": "Pennsylvania 7th District Democratic primary",
      "winner": "Bob Brooks",
      "alignment": "Blue Dog",
      "alignmentId": "bluedog",
      "raceType": "house",
      "result": "win",
      "margin": null,
      "stakes": "Highly competitive Republican-held seat",
      "source": "bdpac-news"
    }
  ],
  "events": [
    {
      "date": "2026-08-26",
      "type": "tension",
      "faction": "progressive",
      "points": 0,
      "title": "Jeffries–Kushner meeting triggers backlash from the left",
      "summary": "Reported criticism reopened a strategy and access dispute between House leadership and progressive Democrats.",
      "source": "axios-jeffries"
    },
    {
      "date": "2026-08-21",
      "type": "tension",
      "faction": "progressive",
      "points": 0,
      "title": "Florida nominee and state chair clash after upset",
      "summary": "Angie Nixon’s primary win was followed by an argument over party support and the socialist label.",
      "source": "axios-nixon"
    },
    {
      "date": "2026-08-20",
      "type": "win",
      "faction": "progressive",
      "points": 2,
      "title": "Aisha Wahab wins California special election",
      "summary": "The progressive candidate prevailed after substantial outside spending entered the race against her.",
      "source": "ap-wahab"
    },
    {
      "date": "2026-08-18",
      "type": "major-win",
      "faction": "progressive",
      "points": 3,
      "title": "Angie Nixon wins Florida Senate primary",
      "summary": "The DSA member scored a surprise statewide nomination, though the general election remains Republican-favoured.",
      "source": "axios-nixon"
    },
    {
      "date": "2026-08-11",
      "type": "major-win",
      "faction": "progressive",
      "points": 3,
      "title": "Peggy Flanagan defeats leadership-backed Angie Craig",
      "summary": "A progressive won a marquee open-seat Senate primary despite heavy outside spending.",
      "source": "ap-change"
    },
    {
      "date": "2026-08-11",
      "type": "win",
      "faction": "newdem",
      "points": 2,
      "title": "David Crowley turns back Wisconsin’s socialist challenger",
      "summary": "The more moderate candidate narrowly won a competitive gubernatorial primary.",
      "source": "ap-change"
    },
    {
      "date": "2026-08-04",
      "type": "major-win",
      "faction": "progressive",
      "points": 3,
      "title": "Abdul El-Sayed wins Michigan Senate primary",
      "summary": "The progressive nominee beat establishment-backed Haley Stevens by roughly one point after major outside spending.",
      "source": "abc-primaries"
    },
    {
      "date": "2026-08-04",
      "type": "win",
      "faction": "newdem",
      "points": 2,
      "title": "Wesley Bell defeats Cori Bush in rematch",
      "summary": "The incumbent, backed by Democratic leaders and CBC PAC, won by about 22 points.",
      "source": "abc-primaries"
    },
    {
      "date": "2026-08-04",
      "type": "win",
      "faction": "bluedog",
      "points": 2,
      "title": "Marie Gluesenkamp Perez advances over a left challenger",
      "summary": "The Blue Dog incumbent protected her position in one of the party’s most difficult districts.",
      "source": "week-aug5"
    },
    {
      "date": "2026-07-15",
      "type": "policy-win",
      "faction": "bluedog",
      "points": 2,
      "title": "Blue Dogs claim housing provisions enacted",
      "summary": "The caucus identified several of its priorities in the 21st Century ROAD to Housing Act after it became law.",
      "source": "bd-housing-win"
    },
    {
      "date": "2026-06-23",
      "type": "major-win",
      "faction": "progressive",
      "points": 3,
      "title": "Mamdani-backed House slate sweeps three New York primaries",
      "summary": "Three progressive endorsees won, defeating two incumbents and extending the mayor’s influence.",
      "source": "ap-mamdani"
    },
    {
      "date": "2026-05-19",
      "type": "win",
      "faction": "bluedog",
      "points": 2,
      "title": "Bob Brooks wins PA-07 Democratic nomination",
      "summary": "The Blue Dog-endorsed firefighter advanced in one of the country’s most competitive House races.",
      "source": "bdpac-news"
    },
    {
      "date": "2026-05-12",
      "type": "agenda",
      "faction": "newdem",
      "points": 2,
      "title": "New Dems release 2026 governing agenda",
      "summary": "The coalition’s American Promise links eleven policy frameworks under affordability, problem-solving and anti-corruption goals.",
      "source": "ndc-agenda"
    }
  ],
  "financeRaces": [
    {
      "date": "2025-06-24",
      "race": "New York City mayor",
      "winner": "Zohran Mamdani",
      "opponent": "Andrew Cuomo",
      "winnerAlignment": "Progressive / DSA",
      "alignmentId": "progressive",
      "labelBasis": [
        "self-identification",
        "official endorsements"
      ],
      "winnerVoteShare": 56.4,
      "opponentVoteShare": 43.6,
      "winnerReceipts": 1700000,
      "opponentReceipts": 3984000,
      "winnerSmallDonorShare": 96.1,
      "opponentSmallDonorShare": 52.4,
      "winnerPublicFunds": 7050000,
      "opponentPublicFunds": 4256000,
      "outsideAgainstWinner": null,
      "status": "certified RCV final round",
      "sources": [
        "nyc-results",
        "nyc-cfb"
      ]
    },
    {
      "date": "2026-08-04",
      "race": "Michigan U.S. Senate Democratic primary",
      "winner": "Abdul El-Sayed",
      "opponent": "Haley Stevens",
      "winnerAlignment": "Movement progressive",
      "alignmentId": "progressive",
      "labelBasis": [
        "official endorsements",
        "issue positions"
      ],
      "winnerVoteShare": 48.5,
      "opponentVoteShare": 47.5,
      "winnerReceipts": 14514000,
      "opponentReceipts": 11885000,
      "winnerSmallDonorShare": null,
      "opponentSmallDonorShare": null,
      "winnerPublicFunds": null,
      "opponentPublicFunds": null,
      "outsideAgainstWinner": 32000000,
      "status": "reported result; candidate totals through July 15",
      "sources": [
        "mi-results",
        "ap-mi",
        "fec-el-sayed",
        "fec-stevens"
      ]
    },
    {
      "date": "2026-08-11",
      "race": "Minnesota U.S. Senate Democratic primary",
      "winner": "Peggy Flanagan",
      "opponent": "Angie Craig",
      "winnerAlignment": "Progressive",
      "alignmentId": "progressive",
      "labelBasis": [
        "official endorsements",
        "issue positions"
      ],
      "winnerVoteShare": 59.01,
      "opponentVoteShare": 39.39,
      "winnerReceipts": 6516000,
      "opponentReceipts": 12747000,
      "winnerSmallDonorShare": null,
      "opponentSmallDonorShare": null,
      "winnerPublicFunds": null,
      "opponentPublicFunds": null,
      "outsideAgainstWinner": null,
      "status": "official result; FEC cycle totals",
      "sources": [
        "mn-results",
        "fec-flanagan",
        "fec-craig"
      ]
    },
    {
      "date": "2026-08-18",
      "race": "Florida U.S. Senate Democratic primary",
      "winner": "Angie Nixon",
      "opponent": "Alex Vindman",
      "winnerAlignment": "Progressive / DSA",
      "alignmentId": "progressive",
      "labelBasis": [
        "organisation membership",
        "self-identification"
      ],
      "winnerVoteShare": 56.06,
      "opponentVoteShare": 43.94,
      "winnerReceipts": 974845,
      "opponentReceipts": 16274000,
      "winnerSmallDonorShare": null,
      "opponentSmallDonorShare": null,
      "winnerPublicFunds": null,
      "opponentPublicFunds": null,
      "outsideAgainstWinner": null,
      "status": "official result; FEC cycle totals",
      "sources": [
        "fl-results",
        "fec-nixon",
        "fec-vindman",
        "ap-fl"
      ]
    },
    {
      "date": "2026-08-11",
      "race": "Wisconsin governor Democratic primary",
      "winner": "David Crowley",
      "opponent": "Francesca Hong",
      "winnerAlignment": "Center / institutional",
      "alignmentId": "newdem",
      "labelBasis": [
        "editorial description"
      ],
      "winnerVoteShare": 39.8,
      "opponentVoteShare": 39.3,
      "winnerReceipts": null,
      "opponentReceipts": null,
      "winnerSmallDonorShare": null,
      "opponentSmallDonorShare": null,
      "winnerPublicFunds": null,
      "opponentPublicFunds": null,
      "outsideAgainstWinner": null,
      "status": "reported result",
      "sources": [
        "ap-wi",
        "npr-wi"
      ]
    },
    {
      "date": "2024-08-06",
      "race": "Missouri 1st District Democratic primary",
      "winner": "Wesley Bell",
      "opponent": "Cori Bush",
      "winnerAlignment": "Institutional / pro-Israel",
      "alignmentId": "newdem",
      "labelBasis": [
        "endorsement network",
        "issue alignment"
      ],
      "winnerVoteShare": 51.1,
      "opponentVoteShare": 45.6,
      "winnerReceipts": null,
      "opponentReceipts": null,
      "winnerSmallDonorShare": null,
      "opponentSmallDonorShare": null,
      "winnerPublicFunds": null,
      "opponentPublicFunds": null,
      "outsideAgainstWinner": null,
      "outsideAgainstOpponent": 9000000,
      "status": "official result",
      "sampleRole": "2024 historical benchmark",
      "sources": [
        "mo-results",
        "axios-bush"
      ]
    }
  ],
  "publicIndicators": [
    {
      "label": "Democrats viewing socialism positively",
      "value": 66,
      "comparison": "Capitalism: 42%",
      "fieldDate": "2025",
      "source": "gallup-socialism",
      "interpretation": "Label receptivity inside the party; not support for a particular candidate or programme."
    },
    {
      "label": "Democrats sympathising more with Palestinians",
      "value": 65,
      "comparison": "Israelis: 17%",
      "fieldDate": "2026",
      "source": "gallup-mideast",
      "interpretation": "A major foreign-policy pressure on party elites and outside-spending networks."
    },
    {
      "label": "Democrats optimistic about their party’s future",
      "value": 35,
      "comparison": "57% in July 2024",
      "fieldDate": "May 2025",
      "source": "apnorc-optimism",
      "interpretation": "Low optimism creates an opening for change-oriented factions."
    },
    {
      "label": "Democrats frustrated with their own party",
      "value": 67,
      "comparison": "Most common complaint: insufficient resistance",
      "fieldDate": "October 2025",
      "source": "pew-frustration",
      "interpretation": "Measures appetite for confrontation, not a clean left-right preference."
    },
    {
      "label": "Bernie Sanders favourability among Democrats",
      "value": 75,
      "comparison": "AOC 55%; Chuck Schumer 35%",
      "fieldDate": "May 2025",
      "source": "apnorc-optimism",
      "interpretation": "Leader-level standing; individual popularity is not identical to faction power."
    },
    {
      "label": "Leftward Progressives in Pew Democratic typology",
      "value": 14,
      "comparison": "Order & Opportunity Left 24%; Left-Out Left 18%; Loyal Liberals 21%",
      "fieldDate": "2026",
      "source": "pew-typology",
      "interpretation": "The Democratic coalition contains several distinct value clusters, not two fixed camps."
    }
  ],
  "history": [
    {
      "date": "2026-08-28",
      "label": "Baseline snapshot",
      "editorialAsOf": "2026-08-28",
      "fecAsOf": "2026-07-31",
      "metrics": {
        "published_members": {
          "progressive": 101,
          "newdem": 114,
          "bluedog": 10
        },
        "democratic_leadership_offices": {
          "progressive": 8,
          "newdem": 6,
          "bluedog": 0
        },
        "standing_committee_ranking_members": {
          "progressive": 12,
          "newdem": 6,
          "bluedog": 0
        },
        "membership_change_floor": {
          "progressive": 1,
          "newdem": 4,
          "bluedog": 0
        },
        "freshman_119": {
          "progressive": 7,
          "newdem": 25,
          "bluedog": null
        },
        "endorsed_candidates_2026": {
          "progressive": 25,
          "newdem": 34,
          "bluedog": 12
        },
        "known_primary_wins_2026": {
          "progressive": 3,
          "newdem": 3,
          "bluedog": 1
        },
        "red_to_blue_2026": {
          "progressive": null,
          "newdem": 20,
          "bluedog": 4
        },
        "pac_receipts_monthly": {
          "progressive": 304820.09,
          "newdem": 218147.12,
          "bluedog": 99471.77
        },
        "pac_total_receipts": {
          "progressive": 5791581.68,
          "newdem": 4144795.26,
          "bluedog": 1889963.54
        },
        "pac_disbursements": {
          "progressive": 6751574.25,
          "newdem": 3392784.38,
          "bluedog": 1871591.89
        },
        "individual_contribution_share": {
          "progressive": 82.75,
          "newdem": 25.19,
          "bluedog": 23.59
        },
        "unitemized_individual_share": {
          "progressive": 72.92,
          "newdem": 10.09,
          "bluedog": 29.72
        },
        "independent_expenditures": {
          "progressive": 2362130.5,
          "newdem": 0,
          "bluedog": 0
        },
        "candidate_contributions": {
          "progressive": 575000,
          "newdem": 645000,
          "bluedog": 298500
        },
        "cash_on_hand": {
          "progressive": 142374.69,
          "newdem": 990766.43,
          "bluedog": 234136.68
        },
        "receipts_per_member": {
          "progressive": 57342.39,
          "newdem": 36357.85,
          "bluedog": 188996.35
        },
        "agenda_breadth": {
          "progressive": 10,
          "newdem": 11,
          "bluedog": 4
        },
        "current_policy_outputs": {
          "progressive": 10,
          "newdem": 31,
          "bluedog": 4
        },
        "documented_policy_wins_90d": {
          "progressive": 0,
          "newdem": 0,
          "bluedog": 1
        },
        "recent_win_points": {
          "progressive": 14,
          "newdem": 6,
          "bluedog": 6
        },
        "source_coverage": {
          "progressive": 13,
          "newdem": 10,
          "bluedog": 9
        }
      }
    }
  ],
  "measureCatalogue": {
    "Elections": [
      [
        "Curated primary wins (no win-rate denominator)",
        "live sample"
      ],
      [
        "Vote share and margin",
        "live sample"
      ],
      [
        "Incumbent defence rate",
        "partial"
      ],
      [
        "Same-party incumbent upsets",
        "live sample"
      ],
      [
        "Open-seat capture rate",
        "partial"
      ],
      [
        "General-election conversion",
        "after November"
      ],
      [
        "Seat gains and losses",
        "after November"
      ],
      [
        "Safe-seat vs competitive-seat results",
        "partial"
      ],
      [
        "District baseline overperformance",
        "ready"
      ],
      [
        "Performance versus polling",
        "ready"
      ],
      [
        "Office-weighted wins",
        "ready"
      ],
      [
        "Geographic breadth",
        "partial"
      ],
      [
        "Turnout and ballots cast",
        "ready"
      ],
      [
        "Ranked-choice transfer gain",
        "live NYC"
      ],
      [
        "Votes per campaign dollar",
        "live sample"
      ],
      [
        "Outside-spending resistance",
        "live sample"
      ],
      [
        "Near-miss rate",
        "needs complete candidate universe"
      ],
      [
        "Endorser-backed upset rate",
        "partial"
      ]
    ],
    "Money": [
      [
        "PAC receipts",
        "live"
      ],
      [
        "PAC spending",
        "live"
      ],
      [
        "Cash on hand",
        "live"
      ],
      [
        "Individual contribution share",
        "live"
      ],
      [
        "Unitemized individual share",
        "live proxy"
      ],
      [
        "Direct candidate contributions",
        "live"
      ],
      [
        "Independent expenditures",
        "live"
      ],
      [
        "Receipts per caucus member",
        "live"
      ],
      [
        "Candidate receipts gap",
        "live sample"
      ],
      [
        "Public matching-fund leverage",
        "live NYC"
      ],
      [
        "Burn rate",
        "ready"
      ],
      [
        "Debt and refund rate",
        "ready"
      ],
      [
        "Self-funding share",
        "ready"
      ],
      [
        "Contribution bands",
        "needs bulk data"
      ],
      [
        "Unique and repeat donors",
        "needs deduping"
      ],
      [
        "Median contribution",
        "needs bulk data"
      ],
      [
        "In-state contribution share",
        "needs bulk data"
      ],
      [
        "Donor concentration / HHI",
        "needs bulk data"
      ]
    ],
    "Networks": [
      [
        "Official endorsements",
        "live"
      ],
      [
        "Known endorsement wins",
        "partial"
      ],
      [
        "Bayesian endorsement win rate",
        "ready"
      ],
      [
        "DCCC Red to Blue overlap",
        "partial"
      ],
      [
        "Union endorsements",
        "ready"
      ],
      [
        "Elected-official endorsements",
        "ready"
      ],
      [
        "Cross-faction co-endorsements",
        "ready"
      ],
      [
        "Endorser centrality",
        "planned"
      ],
      [
        "Incumbent-upset endorsements",
        "live sample"
      ],
      [
        "Post-primary unity endorsements",
        "live sample"
      ],
      [
        "Endorsement withdrawals",
        "planned"
      ],
      [
        "Marginal polling lift",
        "needs polling series"
      ]
    ],
    "Voters": [
      [
        "Faction leader favourability",
        "live sample"
      ],
      [
        "Ideological label favourability",
        "live"
      ],
      [
        "Party optimism",
        "live"
      ],
      [
        "Party frustration",
        "live"
      ],
      [
        "Foreign-policy alignment",
        "live"
      ],
      [
        "Democratic coalition typology",
        "live"
      ],
      [
        "Issue distance from Democratic voters",
        "ready"
      ],
      [
        "Issue distance from general electorate",
        "ready"
      ],
      [
        "Enthusiasm and definite-vote share",
        "needs polling"
      ],
      [
        "Confrontation vs compromise preference",
        "needs polling"
      ],
      [
        "Electability gap versus same opponent",
        "needs polling"
      ],
      [
        "Coalition demographics",
        "ready"
      ]
    ],
    "Agenda & media": [
      [
        "Published agenda breadth",
        "live"
      ],
      [
        "Recent policy outputs",
        "live"
      ],
      [
        "Documented policy enactments",
        "partial"
      ],
      [
        "Bills introduced",
        "Congress API ready"
      ],
      [
        "Cosponsor breadth",
        "Congress API ready"
      ],
      [
        "Committee advancement",
        "Congress API ready"
      ],
      [
        "Party-platform adoption",
        "manual coding"
      ],
      [
        "Cross-faction issue uptake",
        "manual coding"
      ],
      [
        "News mention share",
        "GDELT ready"
      ],
      [
        "Unique outlet count",
        "GDELT ready"
      ],
      [
        "Local vs national coverage",
        "GDELT ready"
      ],
      [
        "Google search interest",
        "export ready"
      ],
      [
        "Wikipedia pageviews",
        "API ready"
      ],
      [
        "Favourable/hostile framing",
        "manual coding"
      ]
    ],
    "Recruitment": [
      [
        "PAC candidate pipeline",
        "live"
      ],
      [
        "FEC Form 2 filings",
        "API ready"
      ],
      [
        "Filed to ballot-qualified funnel",
        "planned"
      ],
      [
        "Ballot-qualified to nominee funnel",
        "partial"
      ],
      [
        "Nominee to elected funnel",
        "after November"
      ],
      [
        "Candidate growth from prior cycle",
        "planned"
      ],
      [
        "Competitive-seat mix",
        "partial"
      ],
      [
        "Same-party incumbent challenges",
        "live sample"
      ],
      [
        "Prior elective office",
        "manual coding"
      ],
      [
        "Union or organising background",
        "manual coding"
      ],
      [
        "Candidate demographic diversity",
        "manual coding"
      ],
      [
        "State and office-level expansion",
        "ready"
      ],
      [
        "Dropout and withdrawal rate",
        "planned"
      ],
      [
        "Recruitment target vs actual",
        "planned"
      ]
    ]
  },
  "sources": [
    {
      "id": "cpc-members",
      "publisher": "Congressional Progressive Caucus",
      "title": "Caucus Members",
      "url": "https://progressives.house.gov/caucus-members",
      "kind": "official",
      "accessed": "2026-08-28"
    },
    {
      "id": "cpc-stands",
      "publisher": "Congressional Progressive Caucus",
      "title": "What We Stand For",
      "url": "https://progressives.house.gov/what-we-stand-for",
      "kind": "official",
      "accessed": "2026-08-28"
    },
    {
      "id": "cpc-bills",
      "publisher": "Congressional Progressive Caucus",
      "title": "Endorsed Bills",
      "url": "https://progressives.house.gov/endorsed-bills",
      "kind": "official",
      "accessed": "2026-08-28"
    },
    {
      "id": "cpc-grijalva",
      "publisher": "Congressional Progressive Caucus",
      "title": "CPC Welcomes Adelita Grijalva",
      "url": "https://progressives.house.gov/2025/11/congressional-progressive-caucus-welcomes-adelita-grijalva",
      "kind": "official",
      "accessed": "2026-08-28"
    },
    {
      "id": "cpc-freshmen",
      "publisher": "Congressional Progressive Caucus",
      "title": "CPC Welcomes New Members-Elect Ahead of 119th Congress",
      "url": "https://progressives.house.gov/press-releases?ID=1BBAD296-1A6E-4DAF-9C99-CF0CE92148BD",
      "kind": "official",
      "accessed": "2026-08-28"
    },
    {
      "id": "cpc-pac-home",
      "publisher": "Congressional Progressive Caucus PAC",
      "title": "PAC endorsements and members",
      "url": "https://weareprogressives.org/",
      "kind": "official-pac",
      "accessed": "2026-08-28"
    },
    {
      "id": "cpc-pac-press",
      "publisher": "Congressional Progressive Caucus PAC",
      "title": "Press releases",
      "url": "https://weareprogressives.org/press-releases/",
      "kind": "official-pac",
      "accessed": "2026-08-28"
    },
    {
      "id": "ndc-home",
      "publisher": "New Democrat Coalition",
      "title": "About the New Dems",
      "url": "https://newdemocratcoalition.house.gov/",
      "kind": "official",
      "accessed": "2026-08-28"
    },
    {
      "id": "ndc-members",
      "publisher": "New Democrat Coalition",
      "title": "Members",
      "url": "https://newdemocratcoalition.house.gov/members",
      "kind": "official",
      "accessed": "2026-08-28"
    },
    {
      "id": "ndc-110",
      "publisher": "New Democrat Coalition",
      "title": "110 New Dem Members Sworn In",
      "url": "https://newdemocratcoalition.house.gov/media-center/press-releases/new-dem-chair-schneider-celebrates-swearing-in-of-110-new-dem-members-including-25-freshmen",
      "kind": "official",
      "accessed": "2026-08-28"
    },
    {
      "id": "ndc-agenda",
      "publisher": "New Democrat Coalition",
      "title": "The American Promise: 2026 Governing Agenda",
      "url": "https://newdemocratcoalition.house.gov/media-center/press-releases/new-dems-release-governing-agenda_the-american-promise-lower-costs-less-chaos-real-solutions",
      "kind": "official",
      "accessed": "2026-08-28"
    },
    {
      "id": "ndaf-34",
      "publisher": "NewDem Action Fund",
      "title": "New Dems Endorse Five Candidates, Bringing Total to 34",
      "url": "https://newdemactionfund.com/press-releases/2026/7/8/new-dems-endorse-five-candidates-in-california-florida-iowa-michigan-and-arizona",
      "kind": "official-pac",
      "accessed": "2026-08-28"
    },
    {
      "id": "ndaf-press",
      "publisher": "NewDem Action Fund",
      "title": "Press Releases",
      "url": "https://newdemactionfund.com/press",
      "kind": "official-pac",
      "accessed": "2026-08-28"
    },
    {
      "id": "ndaf-red2blue",
      "publisher": "NewDem Action Fund",
      "title": "Twenty of Twenty-Four Endorsees in DCCC Red to Blue",
      "url": "https://newdemactionfund.com/press-releases/2026/6/5/new-dems-endorse-rebecca-bennett-in-new-jersey-and-marni-von-wilpert-in-california",
      "kind": "official-pac",
      "accessed": "2026-08-28"
    },
    {
      "id": "bd-members",
      "publisher": "Blue Dog Coalition",
      "title": "Members",
      "url": "https://bluedogs-gluesenkampperez.house.gov/members",
      "kind": "official",
      "accessed": "2026-08-28"
    },
    {
      "id": "bd-legislation",
      "publisher": "Blue Dog Coalition",
      "title": "Endorsed Policy and Legislation",
      "url": "https://bluedogs-gluesenkampperez.house.gov/about/endorsed-legislation",
      "kind": "official",
      "accessed": "2026-08-28"
    },
    {
      "id": "bd-housing-win",
      "publisher": "Blue Dog Coalition",
      "title": "Blue Dogs Secure Housing Wins in Landmark Legislation",
      "url": "https://bluedogs-gluesenkampperez.house.gov/media-center/press-releases",
      "kind": "official",
      "accessed": "2026-08-28"
    },
    {
      "id": "bdpac-home",
      "publisher": "Blue Dog PAC",
      "title": "Coalition, priorities and 2026 candidates",
      "url": "https://bluedogdems.com/",
      "kind": "official-pac",
      "accessed": "2026-08-28"
    },
    {
      "id": "bdpac-12",
      "publisher": "Blue Dog PAC",
      "title": "Six New Endorsements Bring 2026 Total to Twelve",
      "url": "https://bluedogdems.com/blue-dog-pac-endorses-six-new-candidates-built-to-win-in-competitive-districts/",
      "kind": "official-pac",
      "accessed": "2026-08-28"
    },
    {
      "id": "bdpac-news",
      "publisher": "Blue Dog PAC",
      "title": "News and Updates",
      "url": "https://bluedogdems.com/news/",
      "kind": "official-pac",
      "accessed": "2026-08-28"
    },
    {
      "id": "house-democrats",
      "publisher": "House Democratic Caucus",
      "title": "Who We Are",
      "url": "https://democrats.house.gov/who-we-are",
      "kind": "official",
      "accessed": "2026-08-28"
    },
    {
      "id": "dems-leadership",
      "publisher": "House Democratic Caucus",
      "title": "119th Congress leadership roles",
      "url": "https://www.dems.gov/who-we-are",
      "kind": "official",
      "accessed": "2026-08-28"
    },
    {
      "id": "house-committee-leadership",
      "publisher": "U.S. House of Representatives",
      "title": "House committee leadership data",
      "url": "https://radiotv.house.gov/house-data/house-committee-leadership",
      "kind": "government-data",
      "accessed": "2026-08-28"
    },
    {
      "id": "fec-cpc",
      "publisher": "Federal Election Commission",
      "title": "Congressional Progressive Caucus PAC — committee overview",
      "url": "https://www.fec.gov/data/committee/C00513176/?cycle=2026",
      "kind": "government-data",
      "accessed": "2026-08-28"
    },
    {
      "id": "fec-ndc",
      "publisher": "Federal Election Commission",
      "title": "New Democrat Coalition Action Fund — committee overview",
      "url": "https://www.fec.gov/data/committee/C00409730/?cycle=2026",
      "kind": "government-data",
      "accessed": "2026-08-28"
    },
    {
      "id": "fec-bd",
      "publisher": "Federal Election Commission",
      "title": "Blue Dog Political Action Committee — committee overview",
      "url": "https://www.fec.gov/data/committee/C00305318/?cycle=2026",
      "kind": "government-data",
      "accessed": "2026-08-28"
    },
    {
      "id": "ap-change",
      "publisher": "Associated Press",
      "title": "Forget left vs. center. Democratic voters are making clear they just want change",
      "url": "https://apnews.com/article/democrats-wisconsin-primary-hong-crowley-flanagan-0618c650d24c17a2a8f2d3273d813808",
      "kind": "reporting",
      "accessed": "2026-08-28"
    },
    {
      "id": "abc-primaries",
      "publisher": "ABC News",
      "title": "Primaries takeaways: Progressives score big wins and turn to November",
      "url": "https://abcnews.com/Politics/primaries-takeaways-progressives-score-big-wins-turn-november/story?id=135392899",
      "kind": "reporting",
      "accessed": "2026-08-28"
    },
    {
      "id": "week-aug5",
      "publisher": "The Week",
      "title": "Democratic primaries hand wins to leftist, center factions",
      "url": "https://theweek.com/politics/democratic-primaries-wins-leftist-center",
      "kind": "reporting",
      "accessed": "2026-08-28"
    },
    {
      "id": "ap-mamdani",
      "publisher": "Associated Press",
      "title": "Mamdani proves his power with New York endorsements",
      "url": "https://apnews.com/article/78d9cc60faff70ffe27fd8d7f6dc1355",
      "kind": "reporting",
      "accessed": "2026-08-28"
    },
    {
      "id": "ap-shah",
      "publisher": "Associated Press",
      "title": "Amish Shah wins Arizona Democratic congressional primary",
      "url": "https://apnews.com/article/c1631e29aaeef27cdf4ea40cb352069d",
      "kind": "reporting",
      "accessed": "2026-08-28"
    },
    {
      "id": "ap-wahab",
      "publisher": "Associated Press",
      "title": "Aisha Wahab wins California special election",
      "url": "https://apnews.com/article/17e1183d99f385000ea95e73d7670de6",
      "kind": "reporting",
      "accessed": "2026-08-28"
    },
    {
      "id": "axios-nixon",
      "publisher": "Axios",
      "title": "Florida Democrats’ Senate nominee and party chair clash over socialism",
      "url": "https://www.axios.com/2026/08/21/florida-democrats-angie-nixon-nikki-fried-socialism",
      "kind": "reporting",
      "accessed": "2026-08-28"
    },
    {
      "id": "axios-jeffries",
      "publisher": "Axios",
      "title": "Inside the backlash over the Jeffries–Kushner meeting",
      "url": "https://www.axios.com/2026/08/26/jeffries-kushner-meeting-reaction-democrats-left",
      "kind": "reporting",
      "accessed": "2026-08-28"
    },
    {
      "id": "nyc-results",
      "publisher": "New York City Board of Elections",
      "title": "2025 Democratic mayoral primary RCV results",
      "url": "https://www.vote.nyc/sites/default/files/pdf/election_results/2025/20250624Primary%20Election/rcv/026916_1.html",
      "kind": "official-results",
      "accessed": "2026-08-28"
    },
    {
      "id": "nyc-cfb",
      "publisher": "New York City Campaign Finance Board",
      "title": "Pre-primary matching funds and fundraising",
      "url": "https://nyccfb.info/media/press-releases/nyc-campaign-finance-board-approves-pre-primary-matching-funds-payments-to-2025-candidates-06-20/",
      "kind": "official-finance",
      "accessed": "2026-08-28"
    },
    {
      "id": "mi-results",
      "publisher": "Michigan Department of State",
      "title": "Election results and data",
      "url": "https://www.michigan.gov/sos/elections/election-results-and-data",
      "kind": "official-results",
      "accessed": "2026-08-28"
    },
    {
      "id": "ap-mi",
      "publisher": "Associated Press",
      "title": "Michigan Senate primary result and spending context",
      "url": "https://apnews.com/article/election-takeaways-michigan-senate-primary-democrats-trump-c957db07eb78ea93c70208ba0a6bceed",
      "kind": "reporting",
      "accessed": "2026-08-28"
    },
    {
      "id": "fec-el-sayed",
      "publisher": "Federal Election Commission",
      "title": "Abdul El-Sayed candidate finance",
      "url": "https://www.fec.gov/data/candidate/S6MI00418/?cycle=2026",
      "kind": "government-data",
      "accessed": "2026-08-28"
    },
    {
      "id": "fec-stevens",
      "publisher": "Federal Election Commission",
      "title": "Haley Stevens candidate finance",
      "url": "https://www.fec.gov/data/candidate/S6MI00426/?cycle=2026",
      "kind": "government-data",
      "accessed": "2026-08-28"
    },
    {
      "id": "mn-results",
      "publisher": "Minnesota Secretary of State",
      "title": "2026 U.S. Senate primary results",
      "url": "https://electionresults.sos.mn.gov/Results/Index?ErsElectionId=200&electionDate=08%2F11%2F2026+00%3A00%3A00&officeInElectionIdList=-1&officeInElectionIdList=38485&scenario=USSenate",
      "kind": "official-results",
      "accessed": "2026-08-28"
    },
    {
      "id": "fec-flanagan",
      "publisher": "Federal Election Commission",
      "title": "Peggy Flanagan candidate finance",
      "url": "https://www.fec.gov/data/candidate/S6MN00440/",
      "kind": "government-data",
      "accessed": "2026-08-28"
    },
    {
      "id": "fec-craig",
      "publisher": "Federal Election Commission",
      "title": "Angie Craig candidate finance",
      "url": "https://www.fec.gov/data/candidate/S6MN00499/",
      "kind": "government-data",
      "accessed": "2026-08-28"
    },
    {
      "id": "fl-results",
      "publisher": "Florida Division of Elections",
      "title": "2026 primary results",
      "url": "https://floridaelectionwatch.gov/TrackCounty/SUM",
      "kind": "official-results",
      "accessed": "2026-08-28"
    },
    {
      "id": "fec-nixon",
      "publisher": "Federal Election Commission",
      "title": "Angie Nixon candidate finance",
      "url": "https://www.fec.gov/data/candidate/S6FL00830/?cycle=2026",
      "kind": "government-data",
      "accessed": "2026-08-28"
    },
    {
      "id": "fec-vindman",
      "publisher": "Federal Election Commission",
      "title": "Alex Vindman candidate finance",
      "url": "https://www.fec.gov/data/candidate/S6FL00855/?cycle=2026",
      "kind": "government-data",
      "accessed": "2026-08-28"
    },
    {
      "id": "ap-fl",
      "publisher": "Associated Press",
      "title": "Florida Senate primary analysis",
      "url": "https://apnews.com/article/63e620b06acba77102cfe32781bd4efa",
      "kind": "reporting",
      "accessed": "2026-08-28"
    },
    {
      "id": "ap-wi",
      "publisher": "Associated Press",
      "title": "Wisconsin gubernatorial primary result",
      "url": "https://apnews.com/article/wisconsin-primary-governor-hong-socialist-acd872f6cf113e741291b9b47f9d9111",
      "kind": "reporting",
      "accessed": "2026-08-28"
    },
    {
      "id": "npr-wi",
      "publisher": "NPR",
      "title": "Wisconsin 2026 primary results",
      "url": "https://apps.npr.org/primary-election-results-2026/states/WI.html",
      "kind": "results",
      "accessed": "2026-08-28"
    },
    {
      "id": "mo-results",
      "publisher": "Missouri Secretary of State",
      "title": "2024 primary election results",
      "url": "https://www.sos.mo.gov/CMSImages/ElectionResultsStatistics/2024PrimaryElection.pdf",
      "kind": "official-results",
      "accessed": "2026-08-28"
    },
    {
      "id": "axios-bush",
      "publisher": "Axios / Associated Press",
      "title": "Wesley Bell defeats Cori Bush",
      "url": "https://www.axios.com/2024/08/07/cori-bush-primary-results-loss-wesley-bell",
      "kind": "reporting",
      "accessed": "2026-08-28"
    },
    {
      "id": "gallup-socialism",
      "publisher": "Gallup",
      "title": "Image of Capitalism Slips to 54% in U.S.",
      "url": "https://news.gallup.com/poll/694835/image-capitalism-slips.aspx",
      "kind": "polling",
      "accessed": "2026-08-28"
    },
    {
      "id": "gallup-mideast",
      "publisher": "Gallup",
      "title": "Israelis No Longer Ahead in Americans’ Middle East Sympathies",
      "url": "https://news.gallup.com/poll/702440/israelis-no-longer-ahead-americans-middle-east-sympathies.aspx",
      "kind": "polling",
      "accessed": "2026-08-28"
    },
    {
      "id": "apnorc-optimism",
      "publisher": "AP-NORC",
      "title": "Little optimism about politics in the U.S., especially among Democrats",
      "url": "https://apnorc.org/projects/little-optimism-about-politics-in-the-u-s-especially-among-democrats/",
      "kind": "polling",
      "accessed": "2026-08-28"
    },
    {
      "id": "pew-frustration",
      "publisher": "Pew Research Center",
      "title": "A year ahead of the midterms: Americans’ dim views of both parties",
      "url": "https://www.pewresearch.org/politics/2025/10/30/a-year-ahead-of-the-midterms-americans-dim-views-of-both-parties/",
      "kind": "polling",
      "accessed": "2026-08-28"
    },
    {
      "id": "pew-typology",
      "publisher": "Pew Research Center",
      "title": "Beyond Red vs. Blue: The Political Typology",
      "url": "https://www.pewresearch.org/politics/2026/06/10/beyond-red-vs-blue-the-political-typology/",
      "kind": "polling",
      "accessed": "2026-08-28"
    },
    {
      "id": "methodology",
      "publisher": "Democratic Power Index",
      "title": "Internal source coverage audit",
      "url": "#methodology",
      "kind": "method",
      "accessed": "2026-08-28"
    }
  ]
};
