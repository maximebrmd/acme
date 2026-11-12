# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class OverviewInbox < Internal::Types::Model
      field :unanswered, -> { Integer }, optional: false, nullable: false
    end
  end
end
