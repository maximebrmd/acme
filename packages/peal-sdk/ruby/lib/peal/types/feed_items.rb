# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class FeedItems < Internal::Types::Model
      field :items, -> { Internal::Types::Array[Peal::Types::FeedItem] }, optional: false, nullable: false
    end
  end
end
