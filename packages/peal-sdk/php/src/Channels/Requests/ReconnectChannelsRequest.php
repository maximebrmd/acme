<?php

namespace Peal\Channels\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Channels\Types\ReconnectChannelsRequestMessages;
use Peal\Channels\Types\ReconnectChannelsRequestReposts;

class ReconnectChannelsRequest extends JsonSerializableType
{
    /**
     * @var ?value-of<ReconnectChannelsRequestMessages> $messages
     */
    public ?string $messages;

    /**
     * @var ?value-of<ReconnectChannelsRequestReposts> $reposts
     */
    public ?string $reposts;

    /**
     * @param array{
     *   messages?: ?value-of<ReconnectChannelsRequestMessages>,
     *   reposts?: ?value-of<ReconnectChannelsRequestReposts>,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->messages = $values['messages'] ?? null;
        $this->reposts = $values['reposts'] ?? null;
    }
}
