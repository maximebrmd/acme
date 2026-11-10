<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class AdsStatus extends JsonSerializableType
{
    /**
     * @var value-of<AdsMode> $mode
     */
    #[JsonProperty('mode')]
    public string $mode;

    /**
     * @var array<value-of<AdNetwork>> $networks
     */
    #[JsonProperty('networks'), ArrayType(['string'])]
    public array $networks;

    /**
     * @param array{
     *   mode: value-of<AdsMode>,
     *   networks: array<value-of<AdNetwork>>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->mode = $values['mode'];
        $this->networks = $values['networks'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
