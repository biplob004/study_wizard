// The course plugin registry for the frontend.
//
// Each course plugin exports a descriptor:
//   { id, activities: { <activityId>: { id, emoji, title, blurb, cta, accent, Component } } }
//
// The backend owns the course *catalog* (titles, blurbs, module lists, word
// counts); this registry maps a course id to the React components that render
// each of its activities. Adding a new course: create a folder under
// `courses/<id>/`, export a descriptor from `index.js`, and add it here.

import vocabulary from "./vocabulary";

export const courses = [vocabulary];

const byId = new Map(courses.map((c) => [c.id, c]));

/** Look up a course plugin by id. */
export function getCoursePlugin(courseId) {
  return byId.get(courseId);
}

/** All registered course plugins. */
export function allCoursePlugins() {
  return courses;
}
