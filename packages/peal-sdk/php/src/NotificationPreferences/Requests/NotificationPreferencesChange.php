<?php

namespace Peal\NotificationPreferences\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\NotificationPreferences\Types\NotificationPreferencesChangeEmail;
use Peal\Core\Json\JsonProperty;

class NotificationPreferencesChange extends JsonSerializableType
{
    /**
     * @var ?NotificationPreferencesChangeEmail $email
     */
    #[JsonProperty('email')]
    public ?NotificationPreferencesChangeEmail $email;

    /**
     * @var ?bool $everyPost
     */
    #[JsonProperty('everyPost')]
    public ?bool $everyPost;

    /**
     * @param array{
     *   email?: ?NotificationPreferencesChangeEmail,
     *   everyPost?: ?bool,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->email = $values['email'] ?? null;
        $this->everyPost = $values['everyPost'] ?? null;
    }
}
