<?php

namespace Peal\Channels\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Types\ChannelConnection;
use Peal\Core\Json\JsonProperty;

class ConnectChannel extends JsonSerializableType
{
    /**
     * @var ?value-of<ChannelConnection> $connection
     */
    #[JsonProperty('connection')]
    public ?string $connection;

    /**
     * @var ?string $handle
     */
    #[JsonProperty('handle')]
    public ?string $handle;

    /**
     * @var ?string $instance
     */
    #[JsonProperty('instance')]
    public ?string $instance;

    /**
     * @param array{
     *   connection?: ?value-of<ChannelConnection>,
     *   handle?: ?string,
     *   instance?: ?string,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->connection = $values['connection'] ?? null;
        $this->handle = $values['handle'] ?? null;
        $this->instance = $values['instance'] ?? null;
    }
}
