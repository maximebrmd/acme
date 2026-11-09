# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class UnreadNotices < Internal::Types::Model
      field :unread, -> { Integer }, optional: false, nullable: false
    end
  end
end
