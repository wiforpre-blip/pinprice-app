/**
 * Working/export image sizing policy.
 *
 * Owner-approved (Sep 2026): the longest edge of any working image must not
 * exceed 1440 px. Never upscale — sources already at or under the cap are kept
 * at their original pixel size.
 *
 * Product evidence provided by the owner:
 * - TikTok image upload guideline keeps total pixels near ~3.69 MP and treats
 *   multi-thousand-pixel portrait frames (e.g. 1440 x 2560) as the high end.
 * - LINE VOOM accepts a wide aspect range (3:1 to 3:4) with a 10 MB file cap
 *   and does not require several-thousand-pixel sources.
 * - Facebook re-optimizes uploads itself, so sending 4000-8000 px exports has
 *   little benefit.
 * - X allows up to 8192x8192, but that is a hard maximum, not a recommended
 *   social output.
 *
 * A 1440 px long edge keeps every orientation inside common social "high"
 * ranges while bounding decode / view-shot capture memory.
 */
export const WORKING_IMAGE_MAX_LONG_EDGE_PX = 1440;
