<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class ConnectOutcomeConnected extends JsonSerializableType
{
    /**
     * @var Channel $channel
     */
    #[JsonProperty('channel')]
    public Channel $channel;

    /**
     * @param array{
     *   channel: Channel,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->channel = $values['channel'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
