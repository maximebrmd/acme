<?php

namespace Peal\Tags\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Types\TagDetails;

class UpdateTagsRequest extends JsonSerializableType
{
    /**
     * @var TagDetails $body
     */
    public TagDetails $body;

    /**
     * @param array{
     *   body: TagDetails,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->body = $values['body'];
    }
}
