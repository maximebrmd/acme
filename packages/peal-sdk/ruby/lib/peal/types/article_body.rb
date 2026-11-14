# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    # The rich-text editor's document: blocks of paragraphs, headings, lists, quotes, rules, code and images.
    class ArticleBody < Internal::Types::Model
      field :content, -> { Internal::Types::Array[Object] }, optional: false, nullable: false

      field :type, -> { Peal::Types::ArticleBodyType }, optional: false, nullable: false
    end
  end
end
