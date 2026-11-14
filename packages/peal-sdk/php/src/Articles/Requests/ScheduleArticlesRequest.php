<?php

namespace Peal\Articles\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Types\ArticleTime;

class ScheduleArticlesRequest extends JsonSerializableType
{
    /**
     * @var ArticleTime $body
     */
    public ArticleTime $body;

    /**
     * @param array{
     *   body: ArticleTime,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->body = $values['body'];
    }
}
