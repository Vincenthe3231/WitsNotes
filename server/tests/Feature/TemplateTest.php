<?php

namespace Tests\Feature;

use App\Models\Template;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TemplateTest extends TestCase
{
    use RefreshDatabase;

    private function auth(): User
    {
        $user = User::factory()->create();
        $this->actingAs($user, 'sanctum');
        return $user;
    }

    private function makeTemplate(array $cards = []): Template
    {
        return Template::create([
            'scope'    => 'system',
            'category' => 'project-plan',
            'name'     => 'Project Plan',
            'doc'      => [
                'board' => ['description' => 'A test template'],
                'cards' => $cards,
            ],
        ]);
    }

    public function test_index_lists_templates(): void
    {
        $this->auth();
        $this->makeTemplate();

        $this->getJson('/api/templates')
            ->assertStatus(200)
            ->assertJsonCount(1);
    }

    public function test_use_clones_blueprint_into_a_new_board_with_cards(): void
    {
        $user = $this->auth();
        $template = $this->makeTemplate([
            ['type' => 'notebook', 'title' => 'Overview', 'x' => 10, 'y' => 20, 'w' => 300, 'h' => 200],
            ['type' => 'todo', 'title' => 'Tasks', 'x' => 350, 'y' => 20, 'w' => 300, 'h' => 400],
        ]);

        $response = $this->postJson("/api/templates/{$template->id}/use")
            ->assertStatus(201);

        $response->assertJsonPath('title', 'Project Plan');
        $response->assertJsonCount(2, 'cards');

        $this->assertDatabaseHas('boards', ['title' => 'Project Plan', 'user_id' => $user->id]);
        $this->assertDatabaseHas('cards', ['type' => 'notebook', 'title' => 'Overview', 'x' => 10, 'y' => 20]);
        $this->assertDatabaseHas('cards', ['type' => 'todo', 'title' => 'Tasks', 'x' => 350, 'y' => 20]);
    }

    public function test_use_accepts_a_custom_title(): void
    {
        $this->auth();
        $template = $this->makeTemplate();

        $this->postJson("/api/templates/{$template->id}/use", ['title' => 'My Custom Board'])
            ->assertStatus(201)
            ->assertJsonPath('title', 'My Custom Board');
    }

    public function test_use_requires_authentication(): void
    {
        $template = $this->makeTemplate();
        $this->postJson("/api/templates/{$template->id}/use")->assertStatus(401);
    }
}
