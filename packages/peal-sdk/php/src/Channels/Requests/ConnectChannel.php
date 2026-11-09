<?php

namespace Peal\Channels\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class ConnectChannel extends JsonSerializableType
{
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
     *   handle?: ?string,
     *   instance?: ?string,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->handle = $values['handle'] ?? null;
        $this->instance = $values['instance'] ?? null;
    }
}
