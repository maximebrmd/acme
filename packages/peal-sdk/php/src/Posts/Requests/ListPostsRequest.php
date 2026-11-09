<?php

namespace Peal\Posts\Requests;

use Peal\Core\Json\JsonSerializableType;

class ListPostsRequest extends JsonSerializableType
{
    /**
     * @var string $from
     */
    public string $from;

    /**
     * @var string $to
     */
    public string $to;

    /**
     * @param array{
     *   from: string,
     *   to: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->from = $values['from'];
        $this->to = $values['to'];
    }
}
