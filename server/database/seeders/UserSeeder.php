<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        for ($i = 1; $i <= 5; $i++) {
            User::firstOrCreate(
                ['email' => "user{$i}@example.com"],
                ['name' => "User {$i}", 'password' => bcrypt('password')]
            );
        }
    }
}
