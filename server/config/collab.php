<?php

return [
    /*
     * Shared secret between Laravel and the Hocuspocus sidecar.
     * Must match COLLAB_JWT_SECRET in collab/.env.
     */
    'jwt_secret' => env('COLLAB_JWT_SECRET', ''),

    /*
     * Shared secret used by the sidecar to call /api/internal/* endpoints.
     * Must match COLLAB_INTERNAL_SECRET in collab/.env.
     */
    'internal_secret' => env('COLLAB_INTERNAL_SECRET', ''),
];
