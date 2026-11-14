<?php

namespace Peal\Articles\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Types\ArticleInput;

class UpdateArticlesRequest extends JsonSerializableType
{
    /**
     * @var ArticleInput $body
     */
    public ArticleInput $body;

    /**
     * @param array{
     *   body: ArticleInput,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->body = $values['body'];
    }
}
