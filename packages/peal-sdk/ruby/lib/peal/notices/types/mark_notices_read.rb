# frozen_string_literal: true

module Peal
  module Notices
    module Types
      class MarkNoticesRead < Internal::Types::Model
        field :ids, -> { Internal::Types::Array[String] }, optional: false, nullable: false
      end
    end
  end
end
