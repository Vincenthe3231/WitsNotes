<?php

namespace Database\Factories;

use App\Models\Board;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class CardFactory extends Factory
{
    public function definition(): array
    {
        return [
            'board_id'   => Board::factory(),
            'created_by' => User::factory(),
            'type'       => 'note',
            'title'      => $this->faker->sentence(3),
            'x'          => 100,
            'y'          => 100,
            'w'          => 320,
            'h'          => 200,
            'z'          => 10,
            'rotation'   => 0,
            'style'      => null,
            'content'    => null,
            'content_text' => null,
        ];
    }
}
