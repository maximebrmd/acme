<?php

namespace Peal\Posts\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Types\PostSchedule;

class ReschedulePostsRequest extends JsonSerializableType
{
    /**
     * @var PostSchedule $body
     */
    public PostSchedule $body;

    /**
     * @param array{
     *   body: PostSchedule,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->body = $values['body'];
    }
}
