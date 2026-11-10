<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class AccountStandingRead extends JsonSerializableType
{
    /**
     * @var ?value-of<TikTokBlock> $blocked
     */
    #[JsonProperty('blocked')]
    public ?string $blocked;

    /**
     * @var array<AccountRestriction> $restrictions
     */
    #[JsonProperty('restrictions'), ArrayType([AccountRestriction::class])]
    public array $restrictions;

    /**
     * @param array{
     *   restrictions: array<AccountRestriction>,
     *   blocked?: ?value-of<TikTokBlock>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->blocked = $values['blocked'] ?? null;
        $this->restrictions = $values['restrictions'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
