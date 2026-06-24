<?php

namespace Database\Factories;

use App\Models\Card;
use Illuminate\Database\Eloquent\Factories\Factory;

class AttachmentFactory extends Factory
{
    public function definition(): array
    {
        return [
            'card_id'       => Card::factory(),
            'disk'          => 'public',
            'path'          => 'attachments/' . $this->faker->uuid() . '.png',
            'mime'          => 'image/png',
            'size'          => $this->faker->numberBetween(1024, 1048576),
            'original_name' => $this->faker->word() . '.png',
        ];
    }
}
