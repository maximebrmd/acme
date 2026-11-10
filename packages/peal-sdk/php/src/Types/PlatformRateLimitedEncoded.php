<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class PlatformRateLimitedEncoded extends JsonSerializableType
{
    /**
     * @var value-of<PlatformRateLimitedEncodedTag> $tag
     */
    #[JsonProperty('_tag')]
    public string $tag;

    /**
     * @var ?int $retryAfterSeconds
     */
    #[JsonProperty('retryAfterSeconds')]
    public ?int $retryAfterSeconds;

    /**
     * @param array{
     *   tag: value-of<PlatformRateLimitedEncodedTag>,
     *   retryAfterSeconds?: ?int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->tag = $values['tag'];
        $this->retryAfterSeconds = $values['retryAfterSeconds'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
