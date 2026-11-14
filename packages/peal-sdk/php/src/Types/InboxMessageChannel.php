<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class InboxMessageChannel extends JsonSerializableType
{
    /**
     * @var string $channelId
     */
    #[JsonProperty('channelId')]
    public string $channelId;

    /**
     * @var string $enabledAt
     */
    #[JsonProperty('enabledAt')]
    public string $enabledAt;

    /**
     * @var ?string $enabledBy
     */
    #[JsonProperty('enabledBy')]
    public ?string $enabledBy;

    /**
     * @param array{
     *   channelId: string,
     *   enabledAt: string,
     *   enabledBy?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->channelId = $values['channelId'];
        $this->enabledAt = $values['enabledAt'];
        $this->enabledBy = $values['enabledBy'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
