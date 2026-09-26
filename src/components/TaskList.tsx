import type { Course } from '../data/types';
import { cx } from '../lib/hooks';
import { actions, useProgress } from '../lib/progress';
import { courseTasks } from '../lib/tasks';
import { Icon } from './Icon';

/** Course tasks: game goals tick themselves; real-world tasks are ticked by the learner. */
export function TaskList({ course }: { course: Course }) {
  const p = useProgress();
  const tasks = courseTasks(course, p);
  return (
    <ul class="task-list">
      {tasks.map((t) => (
        <li key={t.id} class={cx('task', t.done && 'done', t.kind)}>
          <span class="task-check" aria-hidden="true">
            {t.done && <Icon name="check" size={14} />}
          </span>
          <span class="task-body">
            <span class="task-kind">{t.kind === 'auto' ? 'In the game' : 'In real life'}</span>
            <span class="task-text">
              {t.text}
              {t.done && <span class="sr-only"> (done)</span>}
            </span>
          </span>
          {t.kind === 'self' && !t.done ? (
            <button type="button" class="btn btn-soft btn-sm" onClick={() => actions.completeTask(t.id)}>
              I did it · +15 XP
            </button>
          ) : (
            t.progress && !t.done && <span class="task-progress">{t.progress}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
