<?php

namespace Peal\Inbox\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class NewInboxReply extends JsonSerializableType
{
    /**
     * @var string $text
     */
    #[JsonProperty('text')]
    public string $text;

    /**
     * @param array{
     *   text: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->text = $values['text'];
    }
}
