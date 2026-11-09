<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class NotificationPreferences extends JsonSerializableType
{
    /**
     * @var NotificationPreferencesEmail $email
     */
    #[JsonProperty('email')]
    public NotificationPreferencesEmail $email;

    /**
     * @var bool $everyPost
     */
    #[JsonProperty('everyPost')]
    public bool $everyPost;

    /**
     * @param array{
     *   email: NotificationPreferencesEmail,
     *   everyPost: bool,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->email = $values['email'];
        $this->everyPost = $values['everyPost'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
