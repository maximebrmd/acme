<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class MediaStatusUploaded extends JsonSerializableType
{
    /**
     * @var value-of<ProbeState> $probe
     */
    #[JsonProperty('probe')]
    public string $probe;

    /**
     * @param array{
     *   probe: value-of<ProbeState>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->probe = $values['probe'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
