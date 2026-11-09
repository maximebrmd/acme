<?php

namespace Peal\Posts\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Types\TargetConfirmation;

class ConfirmPostsRequest extends JsonSerializableType
{
    /**
     * @var TargetConfirmation $body
     */
    public TargetConfirmation $body;

    /**
     * @param array{
     *   body: TargetConfirmation,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->body = $values['body'];
    }
}
