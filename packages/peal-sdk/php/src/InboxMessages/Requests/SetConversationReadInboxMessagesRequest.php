<?php

namespace Peal\InboxMessages\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class SetConversationReadInboxMessagesRequest extends JsonSerializableType
{
    /**
     * @var bool $read
     */
    #[JsonProperty('read')]
    public bool $read;

    /**
     * @param array{
     *   read: bool,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->read = $values['read'];
    }
}
