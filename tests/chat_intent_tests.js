/**
 * Permanent regression test catalog for the dashboard's local chat Q&A
 * engine (dashboard-panel.js, _chatIntents()/_answerCycleQuestion()).
 *
 * WHY THIS FILE EXISTS: earlier iterations used a plain if/else cascade
 * where a new, more specific question could be silently shadowed by an
 * older, broader one that happened to sit earlier in the file — found and
 * fixed eight separate times across development. The engine was rewritten
 * to pick the highest-specificity matching intent instead of the first
 * one found, which structurally prevents that whole bug class — but ANY
 * future change to trigger wording still needs re-verification against
 * every existing question, not just the new one. This file is that
 * verification, kept so it doesn't have to be retyped by hand each time.
 *
 * HOW TO USE: run with `node chat_intent_tests.js` against a copy of
 * dashboard-panel.js's _chatIntents() test/specificity logic (see the
 * runner script below), or manually re-verify each pair after any change
 * to intent trigger wording.
 *
 * Format: [question, expected_intent_id]
 */
const CHAT_INTENT_TESTS = [
  // Period timing
  ["Wann ist meine nächste Periode?", "next_period"],
  ["wann kommt meine periode", "next_period"],
  ["Wann war meine letzte Periode?", "last_period"],
  ["Wann hatte ich das letzte Mal meine Tage?", "last_period"],
  ["Warum sind meine Tage zu spät?", "why_late"],
  ["Warum verspäten sich meine Tage?", "why_late"],
  ["ich fahre am 17.08.2027 für 2 wochen in urlaub. bekomme ich in dieser zeit meine periode?", "period_in_range"],
  ["Ich fahre am 22.11.2026 für eine Woche in Urlaub. Habe ich dort meine Periode?", "period_in_range"], // German word-numbers ("eine"), not just digits

  // Cycle stats
  ["Wie lang ist mein Zyklus im Schnitt?", "cycle_length"],
  ["What is the average cycle length?", "cycle_length"],
  ["Was war mein kürzester Zyklus?", "shortest_longest_cycle"],
  ["Was war mein längster Zyklus?", "shortest_longest_cycle"],
  ["War mein letzter Zyklus länger als sonst?", "cycle_compare"],
  ["War mein letzter Zyklus kürzer?", "cycle_compare"],
  ["Welcher Zyklustag ist heute?", "cycle_day"],
  ["Wie regelmäßig ist mein Zyklus?", "regularity"],
  ["Wie lange dauert meine Periode normalerweise?", "period_duration"],
  ["What is my period length?", "period_duration"],

  // Fertility
  ["Wann ist mein fruchtbares Fenster?", "fertile_window"],
  ["Wann ist mein Eisprung?", "ovulation_date"],
  ["Wie viele Tage bis zum Eisprung?", "ovulation_days"],
  ["Wurde mein Eisprung durch die Temperaturkurve bestätigt?", "nfp_confirmed"],
  ["ich hatte gestern ungeschützten verkehr. wie hoch ist die wahrscheinlichkeit einer schwangerschaft", "pregnancy_likelihood"],
  ["Wann war mein letzter positiver Ovulationstest?", "ovulation_test"],

  // Glossary
  ["Was ist ein Eisprung?", "glossary"],
  ["What is ovulation?", "glossary"],
  ["Was bedeutet Coverline?", "glossary"],

  // Symptom interpretation
  ["Mein Schleim ist durchsichtig", "mucus_interpretation"],
  ["Wie ist mein Zervixschleim zu deuten wenn er cremig ist?", "mucus_interpretation"],
  ["Mein Muttermund ist hoch und weich", "cervix_interpretation"],

  // History search
  ["Hatte ich in meiner letzten Periode Kopfschmerzen?", "symptom_search"],
  ["Wie oft hatte ich diesen Zyklus Krämpfe?", "symptom_search"],
  ["Wann hatte ich das letzte Mal Sex?", "intercourse"],
  ["Wie oft hatte ich diesen Zyklus Geschlechtsverkehr?", "intercourse"],
  ["Hatte ich diesen Zyklus ungewöhnlichen Ausfluss?", "discharge_search"],
  ["War meine letzte Periode stärker als sonst?", "bleeding_compare"],

  // Products
  ["Reichen mir die Tampons?", "product_stock"],

  // Life stages
  ["Bin ich schon in den Wechseljahren?", "menopause_status"],
  ["In welcher Woche bin ich?", "pregnancy_week"],
  ["Welche Methode nutze ich gerade?", "contraception"],
  ["Wann muss ich meine Spirale wechseln?", "contraception"],
  ["Wie lange dauert das Wochenbett noch?", "postpartum_remaining"],
  ["Wann sollte ich einen Schwangerschaftstest machen?", "pregnancy_test_timing"],
  ["Wann bekomme ich wahrscheinlich meine erste Periode?", "menarche_estimate"],

  // Misc
  ["Welche Abzeichen hab ich schon?", "badges"],
  ["Wie sieht mein Zyklus gerade aus?", "summary"],
  ["Gibt es etwas Auffälliges in meinem Zyklus?", "anomaly_insights"],
  ["Wann fängt meine PMS-Phase an?", "pms_start"],
  ["Wie viele Tage hab ich diesen Monat erfasst?", "tracking_consistency"],

  // Fallback
  ["asdkjaslkdj random gibberish", null], // null = expect the fallback (no intent matches)

  // Symptom correlation, training/spotting search, day lookup
  ["Hab ich vor meiner Periode öfter Kopfschmerzen?", "symptom_correlation"],
  ["Wie oft hab ich diesen Zyklus trainiert?", "training_search"],
  ["Hatte ich diesen Zyklus Zwischenblutungen?", "spotting_search"],
  ["Was hab ich am 15. August erfasst?", "day_lookup"],
  ["Was hab ich am 15. August 2025 erfasst?", "day_lookup"], // explicit year must be honored, not silently dropped

  // Direct "can I get pregnant" phrasing, distinct from the two related
  // existing intents
  ["Kann ich heute schwanger werden?", "pregnant_today"],
  ["ich hatte gestern ungeschützten verkehr. wie hoch ist die wahrscheinlichkeit einer schwangerschaft", "pregnancy_likelihood"],
  ["Kann ich während der Periode schwanger werden?", "pregnant_during_period_info"],

  // Libido search + general educational questions
  ["Hatte ich diesen Zyklus oft Lust?", "libido_search"],
  ["Was ist eine normale Zykluslänge?", "normal_cycle_length_info"],
  ["Kann ich während der Periode schwanger werden?", "pregnant_during_period_info"],
  ["Zählt der erste Tag der Periode als Tag 1?", "day_one_definition_info"],
  ["Wie genau sind eure Vorhersagen?", "prediction_accuracy_info"],

  // Underwear washing, pregnancy test search, PMS glossary
  ["Wann muss ich Unterwäsche waschen?", "underwear_washing"],
  ["Wann war mein letzter positiver Schwangerschaftstest?", "pregnancy_test_search"],
  ["Wann sollte ich einen Schwangerschaftstest machen?", "pregnancy_test_timing"], // must NOT be caught by pregnancy_test_search
  ["Was ist PMS?", "glossary"],

  // Help/discoverability
  ["Was kannst du beantworten?", "help"],
  ["Welche Fragen kann ich stellen?", "help"],

  // Multilingual colloquial terms for "period" + "when/next" — must work
  // together as a combined trigger, not just each word list in isolation
  // (an earlier version of this fix updated PERIOD_WORDS but forgot
  // WHEN_NEXT_WORDS/LATE_WORDS, so the combined condition still failed for
  // non-German/English phrasings even though the period-word itself matched).
  ["Wann kommt meine Erdbeerwoche?", "next_period"],
  ["When is aunt flo coming?", "next_period"],
  ["When is my time of the month?", "next_period"],
  ["Is shark week coming soon?", "next_period"],
  ["Quand sont mes règles?", "next_period"],
  ["¿Cuándo viene mi regla?", "next_period"],
  ["När kommer mina mens?", "next_period"],

  // Additional colloquial terms
  ["Wann kommt Tante Rosa?", "next_period"],
  ["Wann kommt die rote Welle?", "next_period"],
  ["When is my monthly visitor coming?", "next_period"],
  ["Is code red coming next week?", "next_period"],
  ["When does the crimson wave arrive?", "next_period"],
  ["Quand est-ce que j'aurai mes lunes?", "next_period"],
  ["J'ai eu mes lunes hier.", null],
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CHAT_INTENT_TESTS;
}
