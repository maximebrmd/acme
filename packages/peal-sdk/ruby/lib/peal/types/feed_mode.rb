# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module FeedMode
      extend Peal::Internal::Types::Enum

      DRAFT = "draft"
      QUEUE = "queue"
    end
  end
end
