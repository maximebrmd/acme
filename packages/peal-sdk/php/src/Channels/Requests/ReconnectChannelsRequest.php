<?php

namespace Peal\Channels\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Channels\Types\ReconnectChannelsRequestMessages;

class ReconnectChannelsRequest extends JsonSerializableType
{
    /**
     * @var ?value-of<ReconnectChannelsRequestMessages> $messages
     */
    public ?string $messages;

    /**
     * @param array{
     *   messages?: ?value-of<ReconnectChannelsRequestMessages>,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->messages = $values['messages'] ?? null;
    }
}
