<?php

namespace Peal\Posts\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Types\PostDraft;

class UpdatePostsRequest extends JsonSerializableType
{
    /**
     * @var PostDraft $body
     */
    public PostDraft $body;

    /**
     * @param array{
     *   body: PostDraft,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->body = $values['body'];
    }
}
