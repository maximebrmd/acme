<?php

namespace Peal\Review\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class ChangesRequest extends JsonSerializableType
{
    /**
     * @var string $comment
     */
    #[JsonProperty('comment')]
    public string $comment;

    /**
     * @param array{
     *   comment: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->comment = $values['comment'];
    }
}
