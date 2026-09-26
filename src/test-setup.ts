// Tests use the Latin courses unless they load another language themselves.
import { loadCourses } from './data/courses';

await loadCourses('la');
