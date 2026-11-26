import type { ProfileRoastLensKey } from "@/lib/ai/profile-roast-lenses";

const BUILDWITHAREUM_PROMPT = `Creator lens: BuildWithAreum's "10 out of 10 photos to have on your social media, bachelor edition".

Use this checklist as the primary rubric:
1. A solo shot where he is dressed well and looks like he has somewhere to be.
2. A full-body photo that is aesthetically pleasing, but is not a gym selfie.
3. A photo showing emotion; a simple candid laughing photo is a strong pick.
4. A simple travel photo.
5. An outdoor/adventure photo, like hiking or being active outside.
6. A group activity photo with the boys, not just standing around.
7. A clean headshot that does not look like a passport photo.
8. A hobby or interest photo.
9. No dead-fish Tinder cliche energy.
10. A good night-out photo that looks accidental, not staged.

In overall.tagline, include a compact score like "Areum Checklist: 6/10".
In overall.verdict, name the strongest present signals and the biggest missing
signals from the checklist. In realTalk, prioritize the missing checklist shots
as concrete retake briefs. For per-photo verdicts, tie each photo back to the
checklist item it helps or fails to satisfy when possible.`;

const DATINGBYBLAINE_PROMPT = `Creator lens: Blaine Anderson / @datingbyblaine, matchmaker and dating coach. Her public positioning is "Let's Find Your Person"; judge the profile through a serious-dating and matchmaker lens rather than a pure thirst-trap lens.

Use this rubric as the primary lens:
1. Trust: the lead photo should feel warm, clear, safe, and current.
2. Intent: the profile should make it obvious what kind of person and relationship energy he is bringing.
3. Dateability: photos should make it easy to imagine spending time with him in real life.
4. Specificity: prompts and bio should avoid generic "travel, food, friends" mush and give someone an easy, personal opener.
5. Emotional availability: reward warmth, humor, curiosity, and grounded confidence; penalize aloofness, flexing, bitterness, or trying too hard.
6. Matchmaker filter: flag anything that might attract the wrong audience, create avoidable doubt, or make a good match hesitate.

In overall.tagline, use a compact verdict like "Blaine Lens: dateable but vague" or "Blaine Lens: ready to meet". In overall.verdict, name the biggest relationship-readiness signal and the biggest reason a serious match might hesitate. In realTalk, prioritize concrete fixes that make the profile feel more trustworthy, specific, and easy to start a conversation with.`;

const KELSEYWONDERLIN_PROMPT = `Creator lens: Kelsey Wonderlin / @kelseywonderlin, dating coach for women and licensed therapist. Her public positioning is "Find secure love without playing games"; judge the profile through secure attachment, emotional safety, and long-term relationship clarity.

Use this rubric as the primary lens:
1. Secure energy: the profile should feel steady, kind, emotionally available, and not performatively detached.
2. No games: flag ambiguity, baiting, avoidant humor, bitterness, or prompts that make dating feel like a power struggle.
3. Relationship clarity: reward signals that make intentions, lifestyle, and values easier to understand.
4. Emotional maturity: look for accountability, warmth, consistency, and calm confidence.
5. Partner filter: call out anything that would attract anxious/chaotic dynamics or repel someone seeking secure love.
6. Photo safety: photos should feel current, approachable, and grounded rather than overly sexualized, cold, or status-flexing.

In overall.tagline, use a compact verdict like "Kelsey Lens: secure but vague" or "Kelsey Lens: too much chaos". In overall.verdict, name the strongest secure-love signal and the biggest emotional-safety concern. In realTalk, prioritize fixes that make the profile feel clearer, safer, and less game-y.`;

const DAVIDMEESSEN_PROMPT = `Creator lens: David Meessen / @david_meessen, dating expert for men who says he helps busy professionals and business owners find their dream woman. Judge the profile through ambition, masculine presence, standards, and whether it signals a man with a desirable life.

Use this rubric as the primary lens:
1. Leadership: the lead photo should communicate confidence, composure, and direction.
2. Status without cringe: reward polished lifestyle cues, but punish obvious flexing, rented-luxury energy, or insecurity dressed up as success.
3. Dream-partner fit: the profile should make it clear what kind of woman and relationship he is serious enough for.
4. Professional polish: wardrobe, grooming, settings, and bio should support competence rather than undercut it.
5. Masculine warmth: balance strength with approachability; cold, arrogant, or transactional energy should be called out.
6. Scarcity of time: for busy men, prompts should be direct, specific, and easy for a high-quality match to respond to.

In overall.tagline, use a compact verdict like "David Lens: polished but cold" or "David Lens: leader energy". In overall.verdict, name the strongest ambition/status signal and the biggest reason his dream woman might hesitate. In realTalk, prioritize fixes that increase polish, leadership, warmth, and partner clarity.`;

const JAMIEDATE_PROMPT = `Creator lens: Jamie Date / @jamiedate, men's dating coach and "profile maxing" creator. Judge the profile by whether the photos make women respect him, feel attraction, and swipe right.

Use Jamie's two-part profile-maxing rubric as the primary lens.

Photos to get rid of:
1. Car selfies, especially chin-up angles. They are usually the worst angle and feel low-effort.
2. Bad-quality photos: blurry, smudged, dark, compressed, or visually careless.
3. Too-good quality photos: AI, glamor-shot, or hired-photographer energy that makes it look like he needed a dating-profile photoshoot. Polished is good; optics that scream "I hired someone for this app" are not.
4. Serial-killer intensity: trying so hard to look serious, dominant, or mysterious that he forgets women need to feel safe first.
5. Tiny-man landscape shots: beautiful scenery where he is a speck. She is trying to date him, not the mountain.
6. Weak photo real estate: any photo that fails to help her imagine what it would be like to be with him.

Photos he should have:
1. A GQ-looking first photo: clear face, good lighting, strong crop from around the chest up, and he is easy to see. This is non-negotiable.
2. An awe-factor/personality photo: something that makes her go "aww" or smile, like a pet, playful styling, or a charming bit that shows personality.
3. A body shot: if he has the physique, show it, but not as an obvious gym selfie. Make it an activity where he happens to look good.
4. A master-of-your-craft or social-proof photo: playing music, hosting, performing, leading, building, or doing something with/for other people. It should not look like he is alone doing it just for the app.

Do not automatically hate fish photos; Jamie says they can work if made funny. Judge the execution.
Women swipe right more when men smile, so reward warm smiles and call out profiles that are all dead-serious.

In overall.tagline, use a compact verdict like "Jamie Lens: max the lead" or "Jamie Lens: car selfie tax". In overall.verdict, name the biggest photo mistake and the biggest missing must-have. In realTalk, prioritize blunt, concrete profile-maxing moves: what to cut, what to reshoot, and what should lead. For per-photo verdicts, explicitly map photos to Jamie's cut list or must-have list when possible.`;

export function profileRoastLensPrompt(
  lens: ProfileRoastLensKey,
): string | undefined {
  if (lens === "buildwithareum") return BUILDWITHAREUM_PROMPT;
  if (lens === "datingbyblaine") return DATINGBYBLAINE_PROMPT;
  if (lens === "kelseywonderlin") return KELSEYWONDERLIN_PROMPT;
  if (lens === "davidmeessen") return DAVIDMEESSEN_PROMPT;
  if (lens === "jamiedate") return JAMIEDATE_PROMPT;
  return undefined;
}
