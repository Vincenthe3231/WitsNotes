<?php

namespace App\Http\Controllers\Concerns;

trait SanitizesUtf8
{
    /** Strip invalid byte sequences (e.g. mojibake from clipboard paste) so json_encode/Postgres don't choke. */
    protected function sanitizeUtf8(mixed $value): mixed
    {
        if (is_string($value)) {
            return mb_check_encoding($value, 'UTF-8') ? $value : iconv('UTF-8', 'UTF-8//IGNORE', $value);
        }
        if (is_array($value)) {
            return array_map(fn ($v) => $this->sanitizeUtf8($v), $value);
        }
        return $value;
    }
}
