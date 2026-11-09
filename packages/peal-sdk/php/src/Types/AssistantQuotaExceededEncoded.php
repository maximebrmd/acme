<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class AssistantQuotaExceededEncoded extends JsonSerializableType
{
    /**
     * @var value-of<AssistantQuotaExceededEncodedTag> $tag
     */
    #[JsonProperty('_tag')]
    public string $tag;

    /**
     * @var int $dailyLimit
     */
    #[JsonProperty('dailyLimit')]
    public int $dailyLimit;

    /**
     * @var string $resetsAt
     */
    #[JsonProperty('resetsAt')]
    public string $resetsAt;

    /**
     * @param array{
     *   tag: value-of<AssistantQuotaExceededEncodedTag>,
     *   dailyLimit: int,
     *   resetsAt: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->tag = $values['tag'];
        $this->dailyLimit = $values['dailyLimit'];
        $this->resetsAt = $values['resetsAt'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
