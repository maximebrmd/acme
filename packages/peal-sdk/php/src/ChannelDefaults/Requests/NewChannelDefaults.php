<?php

namespace Peal\ChannelDefaults\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Types\TargetOptions;
use Peal\Core\Json\JsonProperty;

class NewChannelDefaults extends JsonSerializableType
{
    /**
     * @var TargetOptions $options
     */
    #[JsonProperty('options')]
    public TargetOptions $options;

    /**
     * @param array{
     *   options: TargetOptions,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->options = $values['options'];
    }
}
