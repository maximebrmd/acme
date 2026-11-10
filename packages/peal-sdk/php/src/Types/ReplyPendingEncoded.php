<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class ReplyPendingEncoded extends JsonSerializableType
{
    /**
     * @var string $replyId
     */
    #[JsonProperty('replyId')]
    public string $replyId;

    /**
     * @param array{
     *   replyId: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->replyId = $values['replyId'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
