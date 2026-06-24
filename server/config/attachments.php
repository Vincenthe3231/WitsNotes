<?php

return [
    'disks' => [
        'image' => env('ATTACH_IMAGE_DISK', 'public'),
        'audio' => env('ATTACH_AUDIO_DISK', 'public'),
        'file'  => env('ATTACH_FILE_DISK',  'public'),
    ],
    'folders' => [
        'image' => env('CF_S3_IMAGE_BOARD_FOLDER', 'attachments'),
        'audio' => 'attachments',
        'file'  => 'attachments',
    ],
];
