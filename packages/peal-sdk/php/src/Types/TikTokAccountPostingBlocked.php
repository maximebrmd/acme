<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class TikTokAccountPostingBlocked extends JsonSerializableType
{
    /**
     * @var value-of<TikTokBlock> $reason
     */
    #[JsonProperty('reason')]
    public string $reason;

    /**
     * @param array{
     *   reason: value-of<TikTokBlock>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->reason = $values['reason'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
