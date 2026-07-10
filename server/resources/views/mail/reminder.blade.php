Reminder: {{ $card->title ?: 'Untitled card' }}

Board: {{ $card->board->title }}
Due: {{ $card->due_at?->toDayDateTimeString() ?? 'n/a' }}

Open it: {{ config('app.frontend_url', config('app.url')) }}/board/{{ $card->board_id }}
