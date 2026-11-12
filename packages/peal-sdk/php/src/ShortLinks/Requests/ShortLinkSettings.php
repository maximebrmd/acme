<?php

namespace Peal\ShortLinks\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class ShortLinkSettings extends JsonSerializableType
{
    /**
     * @var bool $byDefault
     */
    #[JsonProperty('byDefault')]
    public bool $byDefault;

    /**
     * @param array{
     *   byDefault: bool,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->byDefault = $values['byDefault'];
    }
}
