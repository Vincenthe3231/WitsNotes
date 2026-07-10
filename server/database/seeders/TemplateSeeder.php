<?php

namespace Database\Seeders;

use App\Models\Template;
use Illuminate\Database\Seeder;

class TemplateSeeder extends Seeder
{
    /**
     * Seeds the 5 launch templates. Blueprint `doc` shape:
     * { board: { description?, style? }, cards: [{ type, x, y, w, h, z,
     *   rotation?, title?, content?, content_text? }] }
     */
    public function run(): void
    {
        $templates = [
            [
                'category' => 'storyboard',
                'name'     => 'Storyboard',
                'doc'      => [
                    'board' => ['description' => 'Plan a sequence of shots or scenes.'],
                    'cards' => [
                        ['type' => 'notebook', 'title' => 'Synopsis', 'x' => 40, 'y' => 40, 'w' => 320, 'h' => 200],
                        ['type' => 'image', 'title' => 'Shot 1', 'x' => 400, 'y' => 40, 'w' => 280, 'h' => 180],
                        ['type' => 'image', 'title' => 'Shot 2', 'x' => 720, 'y' => 40, 'w' => 280, 'h' => 180],
                        ['type' => 'image', 'title' => 'Shot 3', 'x' => 1040, 'y' => 40, 'w' => 280, 'h' => 180],
                        ['type' => 'sketch', 'title' => 'Sketch notes', 'x' => 400, 'y' => 260, 'w' => 360, 'h' => 280],
                    ],
                ],
            ],
            [
                'category' => 'weekly-schedule',
                'name'     => 'Weekly Schedule',
                'doc'      => [
                    'board' => ['description' => 'Plan your week day by day.'],
                    'cards' => array_map(
                        fn($day, $i) => [
                            'type' => 'todo', 'title' => $day,
                            'x' => 40 + $i * 340, 'y' => 40, 'w' => 300, 'h' => 400,
                        ],
                        ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
                        range(0, 4)
                    ),
                ],
            ],
            [
                'category' => 'project-plan',
                'name'     => 'Project Plan',
                'doc'      => [
                    'board' => ['description' => 'Track goals, tasks, and resources for a project.'],
                    'cards' => [
                        ['type' => 'notebook', 'title' => 'Overview', 'x' => 40, 'y' => 40, 'w' => 340, 'h' => 220],
                        ['type' => 'todo', 'title' => 'To do', 'x' => 420, 'y' => 40, 'w' => 300, 'h' => 400],
                        ['type' => 'todo', 'title' => 'In progress', 'x' => 760, 'y' => 40, 'w' => 300, 'h' => 400],
                        ['type' => 'todo', 'title' => 'Done', 'x' => 1100, 'y' => 40, 'w' => 300, 'h' => 400],
                        ['type' => 'link_list', 'title' => 'Resources', 'x' => 40, 'y' => 300, 'w' => 300, 'h' => 260],
                    ],
                ],
            ],
            [
                'category' => 'team-plan',
                'name'     => 'Team Plan',
                'doc'      => [
                    'board' => ['description' => 'Coordinate goals and ownership across a team.'],
                    'cards' => [
                        ['type' => 'notebook', 'title' => 'Team goals', 'x' => 40, 'y' => 40, 'w' => 340, 'h' => 220],
                        ['type' => 'todo', 'title' => 'Owner 1', 'x' => 420, 'y' => 40, 'w' => 300, 'h' => 300],
                        ['type' => 'todo', 'title' => 'Owner 2', 'x' => 760, 'y' => 40, 'w' => 300, 'h' => 300],
                        ['type' => 'todo', 'title' => 'Owner 3', 'x' => 1100, 'y' => 40, 'w' => 300, 'h' => 300],
                    ],
                ],
            ],
            [
                'category' => 'creative',
                'name'     => 'Creative Moodboard',
                'doc'      => [
                    'board' => ['description' => 'Gather visual references and inspiration.'],
                    'cards' => [
                        ['type' => 'notebook', 'title' => 'Concept', 'x' => 40, 'y' => 40, 'w' => 320, 'h' => 200],
                        ['type' => 'image', 'title' => 'Reference 1', 'x' => 400, 'y' => 40, 'w' => 260, 'h' => 260],
                        ['type' => 'image', 'title' => 'Reference 2', 'x' => 700, 'y' => 40, 'w' => 260, 'h' => 260],
                        ['type' => 'sketch', 'title' => 'Sketch', 'x' => 400, 'y' => 340, 'w' => 360, 'h' => 280],
                    ],
                ],
            ],
        ];

        foreach ($templates as $t) {
            Template::updateOrCreate(
                ['scope' => 'system', 'category' => $t['category'], 'name' => $t['name']],
                ['doc' => $t['doc']]
            );
        }
    }
}
